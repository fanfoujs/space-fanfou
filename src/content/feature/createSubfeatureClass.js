import pick from 'just-pick';
import simpleMemoize from 'just-once';
import waitForHead from '@libs/waitForHead';
import loadAsset, {insertBeforeBody} from '@libs/loadAsset';
import ElementCollection from '@libs/ElementCollection';
import every from '@libs/promiseEvery';
import log from '@libs/log';

export default ({messaging, bridge, modules}) =>
	class Subfeature {
		constructor({featureName, subfeatureName, style, script, parent}) {
			this.featureName = featureName;
			this.subfeatureName = subfeatureName;
			this.parent = parent;
			this.initContext();

			if (style) {
				this.style = {
					element: null,
					code: style,
				};
			}

			if (script) {
				const featureScriptObject = script(this.context) || {};

				if (featureScriptObject.waitReady) {
					this.waitReadyFns.push(featureScriptObject.waitReady);
				}

				this.migrations = featureScriptObject.migrations;
				this.script = pick(featureScriptObject, [
					'applyWhen',
					'onLoad',
					'onSettingsChange',
					'onUnload',
				]);
			}

			this.isApplicable = simpleMemoize(
				this.script?.applyWhen || (() => Promise.resolve(true)),
			);
		}

		get transport() {
			return messaging || bridge;
		}

		initContext() {
			this.waitReadyFns = [];
			this.domEventListeners = [];
			this.elementCollection = new ElementCollection();

			this.context = {
				...pick(this, [
					'requireModules',
					'registerDOMEventListener',
					'elementCollection',
					'readOptionValue',
				]),
				...pick(this.transport, [
					'registerBroadcastListener',
					'unregisterBroadcastListener',
				]),
			};
		}

		requireModules = (moduleNames) => {
			const requiredModules = {};

			for (const moduleName of moduleNames) {
				const module = modules[moduleName];

				if (!module) {
					throw new Error(`未知 module：${moduleName}`);
				}

				this.waitReadyFns.push(module.ready);
				requiredModules[moduleName] = module;
			}

			return requiredModules;
		};
		registerDOMEventListener = (
			element,
			eventType,
			listener,
			options = false,
		) => {
			if (!element) {
				log.error('element 不存在');
			} else if (
				typeof element === 'string' &&
				!this.elementCollection.has(element)
			) {
				log.error('如果使用选择器，请通过 ElementCollection 注册：', element);
			} else if (typeof element !== 'string' && !element.addEventListener) {
				log.error('element 不存在或类型非法', element);
			}

			this.domEventListeners = [
				...this.domEventListeners,
				{
					element,
					eventType,
					listener,
					opts: options,
				},
			];
		};
		readOptionValue = (key) => {
			const optionName = `${this.featureName}/${key}`;
			const optionValue = this.parent.optionValuesCache[optionName];

			return optionValue;
		};

		async load() {
			if (!(await this.isApplicable())) {
				return;
			}

			await this.loadStyle();
			await this.loadScript();
		}

		async unload() {
			if (!(await this.isApplicable())) {
				return;
			}

			this.unloadStyle();
			this.unloadScript();
		}

		async loadStyle() {
			if (!this.style) {
				return;
			}

			await waitForHead();

			this.style.element = loadAsset({
				type: 'style',
				code: this.style.code,
				dataset: pick(this, ['featureName', 'subfeatureName']),
				mount: insertBeforeBody,
			});
		}

		unloadStyle() {
			if (!this.style) {
				return;
			}

			this.style.element.remove();
			this.style.element = null;
		}

		async loadScript() {
			if (!this.script) {
				return;
			}

			if (await every(this.waitReadyFns.map((fn) => fn()))) {
				this.bindDOMEventListeners();
				await this.script.onLoad?.();
			} else {
				log.debug(
					`${this.featureName}[${this.subfeatureName}] 没有加载，因为 waitReady 检查未通过`,
				);
			}
		}

		async unloadScript() {
			if (!this.script) {
				return;
			}

			this.unbindDOMEventListeners();
			await this.script.onUnload?.();
			this.elementCollection.free();
		}

		bindDOMEventListeners() {
			this.processDOMEventListeners('addEventListener');
		}

		unbindDOMEventListeners() {
			this.processDOMEventListeners('removeEventListener');
		}

		processDOMEventListeners(methodName) {
			for (const entry of this.domEventListeners) {
				const {element, eventType, listener, opts} = entry;

				if (!element) {
					log.error('DOM 元素不存在', entry);
					continue;
				}

				const actualElement =
					typeof element === 'string'
						? this.elementCollection.get(element)
						: element;
				const actualElementArray = Array.isArray(actualElement)
					? actualElement
					: [actualElement];

				for (const actualElement_ of actualElementArray) {
					actualElement_[methodName](eventType, listener, opts);
				}
			}
		}

		handleSettingsChange() {
			this.script.onSettingsChange?.();
		}
	};
