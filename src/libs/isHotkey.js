import defined from 'defined';

export default (event, options) =>
	event.ctrlKey === Boolean(options.ctrl) &&
	event.altKey === Boolean(defined(options.alt, options.option)) &&
	event.shiftKey === Boolean(options.shift) &&
	event.metaKey === Boolean(defined(options.command, options.win)) &&
	event.key.toLowerCase() === options.key.toLowerCase();
