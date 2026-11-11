import select from 'select-dom';
import elementReady from 'element-ready';

export default class ElementCollection {
	constructor() {
		this._collection = {};
	}

	add(elements) {
		for (const [alias, elementOptions] of Object.entries(elements)) {
			let selector;
			let parent;
			let getAll;

			if (typeof elementOptions === 'string') {
				selector = elementOptions;
				getAll = false;
			} else {
				selector = elementOptions.selector;
				parent = elementOptions.parent;
				getAll = elementOptions.getAll;
			}

			if (typeof selector !== 'string') {
				throw new TypeError('selector 未指定');
			}

			this._collection[alias] = {
				selector,
				parent,
				getAll,
				element: null,
				promise: null,
			};
		}
	}

	has(alias) {
		return Object.hasOwn(this._collection, alias);
	}

	get(alias) {
		if (Array.isArray(alias)) {
			const returnValue = {};

			for (const item of alias) {
				returnValue[item] = this.get(item);
			}

			return returnValue;
		}

		const entry = this._collection[alias];

		if (!entry.element || (entry.getAll && entry.element.length === 0)) {
			const fn = entry.getAll ? select.all : select;
			const parent = entry.parent ? this.get(entry.parent) : document;

			entry.element = fn(entry.selector, parent);
		}

		return entry.element;
	}

	getAll() {
		const allAliases = Object.keys(this._collection);

		return this.get(allAliases);
	}

	getToken(alias) {
		return {
			isElementCollectionToken: true,
			collection: this,
			alias,
		};
	}

	ready(alias) {
		const entry = this._collection[alias];

		if (entry.parent) {
			throw new Error('不能设定 parent');
		}

		entry.promise ||= elementReady(entry.selector);

		return entry.promise;
	}

	free() {
		for (const entry of Object.values(this._collection)) {
			entry.element = entry.promise = null;
		}
	}
}
