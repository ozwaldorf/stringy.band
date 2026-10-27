// Band photos in public/images, split by orientation for the about collage.
// Captions are handwritten under each print; show and date come from the
// photo's capture date where it lands on a show day.
export interface Photo {
	name: string;
	caption: string;
}

export const landscapePhotos: Photo[] = [
	{ name: 'band/IMG_0059', caption: "S&S Farm Brewery, Sep 26 '26" },
	{ name: 'band/IMG_0317', caption: "Indie Whims, Sep 25 '26" },
	{ name: 'band/IMG_0434', caption: "Pitney Meadows Community Farm" },
	{ name: 'band/IMG_0466', caption: "Cambridge Depot, Oct 17 '26" },
	{ name: 'band/IMG_0949', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'band/IMG_1026', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'band/IMG_1765', caption: "The Monopole, Mar 28 '26" },
	{ name: 'band/IMG_3017', caption: 'The Beans' },
	{ name: 'band/IMG_3502', caption: "El Dorado Bar, May 14 '26" },
	{ name: 'band/IMG_3504', caption: "El Dorado Bar, May 14 '26" },
	{ name: 'band/IMG_3507', caption: "El Dorado Bar, May 14 '26" },
	{ name: 'band/IMG_3626', caption: "The Beans @ Quarters, May 30 '26" },
	{ name: 'band/IMG_6831', caption: 'The Beans' },
	{ name: 'band/IMG_6876', caption: 'The Beans' },
	{ name: 'band/IMG_7576', caption: "The Beans @ Harvey's, Jun 5 '26" },
	{ name: 'band/IMG_7587', caption: "The Beans @ Harvey's, Jun 5 '26" },
	{ name: 'band/IMG_7621', caption: "The Beans @ Harvey's, Jun 5 '26" },
	{ name: 'band/IMG_8098', caption: "The Beans @ Lazy Bear, Jul 11 '26" },
	{ name: 'band/IMG_8105', caption: "The Beans @ Lazy Bear, Jul 11 '26" },
	{ name: 'band/IMG_8159', caption: "The Beans @ Lazy Bear, Jul 11 '26" },
	{ name: 'oz/1793065966863_0', caption: 'Ossian' },
	{ name: 'phoenix/IMG_3503', caption: "El Dorado Bar, May 14 '26" },
	{ name: 'phoenix/IMG_3505', caption: "El Dorado Bar, May 14 '26" }
];

export const portraitPhotos: Photo[] = [
	{ name: 'band/IMG_0942', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'band/IMG_6439', caption: 'The Beans' },
	{ name: 'clara/1793066155680_0', caption: "Clara @ Lazy Bear, Jul 11 '26" },
	{ name: 'clara/1793066375801_0', caption: "Clara @ Lazy Bear, Jul 11 '26" },
	{ name: 'clara/1793066582060_0', caption: "Cambridge Depot, Oct 17 '26" },
	{ name: 'clara/1793066867794_0', caption: "Cambridge Depot, Oct 17 '26" },
	{ name: 'lake/1793065934510_0', caption: 'Lake' },
	{ name: 'lake/1793065987568_0', caption: 'Lake' },
	{ name: 'lake/1793066060198_0', caption: "Lake @ Lazy Bear, Jul 11 '26" },
	{ name: 'lake/1793066270603_0', caption: "Lake @ Lazy Bear, Jul 11 '26" },
	{ name: 'lake/IMG_3510', caption: "Lake @ El Dorado Bar, May 14 '26" },
	{ name: 'lake/IMG_8132', caption: "Lake @ Lazy Bear, Jul 11 '26" },
	{ name: 'oz/1793066199854_0', caption: "Ossian @ Lazy Bear, Jul 11 '26" },
	{ name: 'oz/IMG_0746', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'oz/IMG_3508', caption: "El Dorado Bar, May 14 '26" },
	{ name: 'phoenix/IMG_0680', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'phoenix/IMG_0976', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'phoenix/IMG_2179', caption: "The Daily Gazette, Sep 23 '26" },
	{ name: 'phoenix/IMG_3509', caption: "El Dorado Bar, May 14 '26" },
	{ name: 'phoenix/IMG_6285', caption: 'Phoenix' },
	{ name: 'phoenix/IMG_6789', caption: 'Phoenix' },
	{ name: 'phoenix/IMG_7517', caption: "Phoenix @ Harvey's, Jun 5 '26" },
	{ name: 'phoenix/IMG_7630', caption: "Phoenix @ Harvey's, Jun 5 '26" },
	{ name: 'phoenix/IMG_8117', caption: "Phoenix @ Lazy Bear, Jul 11 '26" },
	{ name: 'phoenix/IMG_8217', caption: "Phoenix @ Lazy Bear, Jul 11 '26" },
	{ name: 'syd/9094', caption: "Syd @ Lazy Bear, Jul 11 '26" },
	{ name: 'syd/1793065845747_0', caption: 'Syd' },
	{ name: 'syd/1793065910806_0', caption: 'Syd' },
	{ name: 'syd/1793066082016_0', caption: "Syd @ Lazy Bear, Jul 11 '26" },
	{ name: 'syd/1793066113674_0', caption: "Syd @ Lazy Bear, Jul 11 '26" },
	{ name: 'syd/1793066131443_0', caption: "Syd @ Lazy Bear, Jul 11 '26" },
	{ name: 'syd/1793066231127_0', caption: "Syd @ Lazy Bear, Jul 11 '26" },
	{ name: 'syd/IMG_0749', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'syd/IMG_0874', caption: "Reef Cannabis Co, Sep 13 '26" },
	{ name: 'syd/IMG_6166', caption: 'Syd' }
];
