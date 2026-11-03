import { zip, unzip } from './archive.mjs';
import { converterFiles, esc, slug, validateSite, wordpressXml } from './sites.mjs';
import { findManifest } from './migration.mjs';

export const conversionFormats=['basic','gutenberg','combined','elementor','divi'];
export function inspectConversionArchive(buffer){
 const files=unzip(buffer);
 const site=findManifest(files,validateSite);
 if(site)return {site,pages:[]};
 const entries=Object.entries(files).filter(([name])=>/\.html?$/i.test(name)&&!name.startsWith('__MACOSX/'));
 if(!entries.length)throw Error('ZIP has no Sitocal manifest or HTML pages');
 if(entries.length>30)throw Error('ZIP must contain no more than 30 HTML pages');
 if(entries.reduce((total,[,bytes])=>total+bytes.length,0)>2*1024*1024)throw Error('ZIP HTML exceeds the 2 MB text extraction limit');
 entries.sort(([left],[right])=>Number(!/(^|\/)index\.html?$/i.test(left))-Number(!/(^|\/)index\.html?$/i.test(right)));
 return {pages:entries.map(([name,bytes])=>({name,html:bytes.toString('utf8')}))};
}

const template=`<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="site-header">
 <a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
 <nav aria-label="Pages"><?php wp_nav_menu( array( 'theme_location' => 'primary', 'container' => false, 'depth' => 1 ) ); ?></nav>
</header>
<main id="content">
<?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
 <article <?php post_class(); ?>><h1><?php the_title(); ?></h1><?php the_content(); ?></article>
<?php endwhile; the_posts_navigation(); else : ?>
 <p>Import or create a page to get started.</p>
<?php endif; ?>
</main>
<footer class="site-footer"><?php bloginfo( 'name' ); ?></footer>
<?php wp_footer(); ?>
</body></html>
`;
const functions=`<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
add_action( 'after_setup_theme', function () {
 add_theme_support( 'title-tag' );
 add_theme_support( 'wp-block-styles' );
 register_nav_menu( 'primary', 'Primary navigation' );
} );
add_action( 'wp_enqueue_scripts', function () {
 wp_enqueue_style( 'sitocal-classic', get_stylesheet_uri(), array(), '1.0.0' );
} );
`;
function classicTheme(site){
 const folder='sitocal-'+slug(site.business);
 const style=`/*
Theme Name: Sitocal Starter
Author: Sitocal
Version: 1.0.0
Description: Responsive classic starter theme for imported Sitocal pages.
*/
:root { --accent: ${site.accent}; }
* { box-sizing: border-box; }
body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #142923; background: #f5f8f6; }
a { color: var(--accent); text-underline-offset: .2em; }
.site-header,.site-footer { padding: 1.25rem max(5vw,1rem); background: #fff; }
.site-header > a { font-weight: 750; font-size: 1.2rem; }
.site-header ul { display:flex; flex-wrap:wrap; gap: 1rem; list-style:none; padding:0; }
main { max-width: 74rem; margin: auto; padding: clamp(1rem,4vw,3rem); }
article { background:#fff; padding:clamp(1rem,4vw,3rem); border-radius:1rem; overflow-wrap:anywhere; }
img { max-width:100%; height:auto; }
`;
 return zip({[folder+'/style.css']:style,[folder+'/index.php']:template,[folder+'/functions.php']:functions});
}

export function wordpressPackage(input,format){
 if(!conversionFormats.includes(format))throw Error('Choose a supported WordPress format');
 const site=validateSite(input);
 if(!['basic','combined'].includes(format))return zip(converterFiles(site,format));
 const basic=format==='basic';
 const files={
  'sitocal-theme.zip':classicTheme(site),
  'wordpress.xml':wordpressXml(site,basic?'basic':'gutenberg'),
  'INSTALL.txt':[
   'Test on a staging WordPress site first.',
   'Unzip this outer bundle. In Appearance > Themes > Add New > Upload Theme, upload sitocal-theme.zip and activate it.',
   'In Tools > Import > WordPress, install or run the importer and upload wordpress.xml. Assign an existing author.',
   'Review the imported drafts, publish the chosen pages, select a home page in Settings > Reading and set up your navigation.',
   'Review contact buttons, forms, SEO settings and internal links before going live. The theme provides a fresh layout for imported content.',
   ...(basic?[]:['Optional: with Elementor active, import each JSON from the elementor folder as a saved template and insert it on the matching page. Choose which editor to use for each page.'])
  ].join('\n')
 };
 if(!basic)for(const [name,value] of Object.entries(converterFiles(site,'elementor')))files['elementor/'+name]=value;
 return zip(files);
}
