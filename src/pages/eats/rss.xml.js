import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../../consts';

export async function GET(context) {
	const restaurants = await getCollection('restaurants');
	return rss({
		title: `Eats - ${SITE_TITLE}`,
		description: 'Restoran İncelemeleri ve Puanlamalar',
		site: context.site,
		items: restaurants.map((restaurant) => ({
			title: restaurant.data.name,
			pubDate: restaurant.data.visitDate,
			description: `${restaurant.data.name} - ${restaurant.data.category}`,
			link: `/eats/${restaurant.id}/`,
		})),
	});
}
