import indexOf from '@libs/indexOf';

// 依先后顺序根据提供的字符串或正则表达式来匹配目标文本前后内容
export default (text, options) => {
	let currentIndex = 0;
	const returnValue = {};

	for (const {key, opening, closing} of options) {
		const matchedOpening = indexOf(text, opening, currentIndex);
		if (matchedOpening.index === -1) {
			break;
		}

		currentIndex = matchedOpening.index + matchedOpening.length;

		const matchedClosing = indexOf(text, closing, currentIndex);
		if (matchedClosing.index === -1) {
			break;
		}

		currentIndex = matchedClosing.index + matchedClosing.length;

		returnValue[key] = text.slice(
			matchedOpening.index + matchedOpening.length,
			matchedClosing.index,
		);
	}

	return returnValue;
};
