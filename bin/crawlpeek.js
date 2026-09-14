#!/usr/bin/env node

// Import cheerio package for HTML parsing
import * as cheerio from "cheerio";

// Activate CLI arguments
import { parseArgs } from 'node:util';

// Import chalk to style CLI output
import chalk from "chalk";

const { values, positionals } = parseArgs({

  options: {
    json: {
      type: "boolean",
      short: "j"
    }

  },
  allowPositionals: true

});
// Capture the url to be crawlseeked
const url = positionals[0] ?? '';

// Check to see if the user has provided a url to crawlseek
if (!url) {

	console.error("Wait! You didn't provide a URL.");
	process.exit(1);

}

// Verify the provided url is a URL
let parsedUrl;

try {

  	parsedUrl = new URL(url);

} catch {

	console.error(`Error: "${url}" is not a valid URL.`);
	process.exit(1);

}

// Attempt to crawl the provided url
try {
	const response = await fetch(url, {
		headers: {
		"User-Agent": "CrawlPeek/0.1"
		}
	});

	const html = await response.text();

	const bytes = Buffer.byteLength(html, "utf8");
	const kib = bytes / 1024;

	const $ = cheerio.load(html);

	const title = $("title").text();
	const h1 = $("h1").first().text();

	let consoleLog = '\nCrawlPeek \n\n';
	let results = {};

	results.url = {};
	results.content = {};
	results.metadata = {};
	results.structuredData = {};

	results.url.requested = `${url}`;
	results.url.final = (response.redirected) ? response.url : url;
	results.url.status = response.status;
	// results.url.size = `${kib.toFixed(2)} KiB`;
	results.url.size = bytes;

	results.content.title = `${title}` || null;
	results.content.h1 = `${h1}` || null;

	results.metadata.description = $('meta[name="description"]').attr("content") || null;
	results.metadata.canonical = $('link[rel="canonical"]').attr("href") || null;
	results.metadata.robots = $('meta[name="robots"]').attr("content") || null;

	results.structuredData.jsonLd = $('script[type="application/ld+json"]').length;
	results.structuredData.types = getStructuredData($);

	results.content.wordCount = countWords($);

	if (values.json) {

		console.log(JSON.stringify(results, null, 2));

	} else {

		outputHumanReadable(results, response);

	}

} catch (error) {
	console.error(`Error: ${error.message}`);
	process.exit(1);
}

function countWords($) {

	$("script, style, noscript").remove();

	const text = $("body")
		.text()
		.replace(/\s+/g, " ")
		.trim();

	const wordCount = text
		? text.split(/\s+/).length
		: 0;

	return wordCount;
}

function getStructuredData($) {

	let types = []

	$('script[type="application/ld+json"]').each( (index, ld) => {

		const content = $(ld).text();
		const parsedContent = JSON.parse(content);

		const contentType = Array.isArray(parsedContent['@type']) ? parsedContent['@type'][0] : parsedContent['@type'];

		types.push(contentType);
	})

	return types;
}

function outputHumanReadable(data, crawl) {

	console.log('\nCrawlPeek 0.1.0')
	console.log(chalk.blackBright.bold('\nURL'))
	console.log('Requested   :', data.url.requested)
	console.log('Final       :', data.url.final)
	console.log('Status      :', data.url.status, crawl.statusText)
	console.log('Size        :', (data.url.size / 1024).toFixed(2), 'KiB' )

	console.log(chalk.blackBright.bold('\nContent'))
	console.log('Title       :', data.content.title || 'Not Found')
	console.log('H1          :', data.content.h1 || 'Not Found')
	console.log('Word Count  :', data.content.wordCount)

	console.log(chalk.blackBright.bold('\nMetadata'))
	console.log('Description :', data.metadata.description || 'Not Specified')
	console.log('Canonical   :', data.metadata.canonical || 'Not Specified')
	console.log('Robots      :', data.metadata.robots || 'Not Specified')

	console.log(chalk.blackBright.bold('\nStructured Data'))
	console.log('JSON-LD     :', data.structuredData.jsonLd || 'Not Found')
	console.log('Types       :', data.structuredData.types.length ? data.structuredData.types.join(', ') : 'Not Found')
	console.log('')
}