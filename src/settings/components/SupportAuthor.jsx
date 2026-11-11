import {h} from 'preact';
import ExternalLink from './ExternalLink';
import xiaohongshuShopQr from '@assets/images/xiaohongshu-shop-qr.svg';

const URL_XIAOHONGSHU_SHOP = 'https://xhslink.com/m/894w257QBwb';

export default function SupportAuthor() {
	return (
		<section className="sf-support-author-shop">
			<img
				className="sf-support-author-qr"
				src={xiaohongshuShopQr}
				alt="小红书小店二维码"
				width="111"
				height="111"
			/>
			<div className="sf-support-author-info">
				<h3>小红书小店</h3>
				<p>逛逛我的小店，支持太空饭否的开发与维护。</p>
				<ExternalLink text="去小店逛逛" url={URL_XIAOHONGSHU_SHOP} />
			</div>
		</section>
	);
}
