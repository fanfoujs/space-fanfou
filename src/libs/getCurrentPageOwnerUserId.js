import simpleMemoize from 'just-once';
import {isUserProfilePage} from '@libs/pageDetect';

// 获取当前页面所有者的 ID（默认当前页面为用户页面）
export default simpleMemoize(async () => {
	const splitPathname = location.pathname.split('/');

	const result = (await isUserProfilePage())
		? splitPathname[1] // Fanfou.com/<userid>
		: splitPathname[2]; // Fanfou.com/album/<userid>

	return decodeURIComponent(result || '');
});
