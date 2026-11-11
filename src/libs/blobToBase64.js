export default (blob) =>
	new Promise((resolve, reject) => {
		const fr = new FileReader();

		fr.addEventListener('load', () => resolve(fr.result));
		fr.onerror = () => reject(fr.error);
		fr.readAsDataURL(blob);
	});
