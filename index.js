const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

(async () => {
  try {
    // URL of the sitemap index
    const sitemapIndexUrl = 'https://www.avathi.com/sitemap.xml';

    // Function to fetch and parse XML from a URL
    const fetchAndParseXML = async (url) => {
      const response = await axios.get(url);
      return await xml2js.parseStringPromise(response.data);
    };

    // Fetch and parse the sitemap index
    const sitemapIndex = await fetchAndParseXML(sitemapIndexUrl);

    // Extract sitemap URLs
    const sitemapUrls = sitemapIndex.sitemapindex.sitemap.map(
      (sitemap) => sitemap.loc[0]
    );

    let pageUrls = [];

    // Fetch and parse each sitemap to get page URLs
    for (const sitemapUrl of sitemapUrls) {
      const sitemap = await fetchAndParseXML(sitemapUrl);

      // Check if the sitemap contains URLs
      if (sitemap.urlset && sitemap.urlset.url) {
        const urls = sitemap.urlset.url.map((url) => url.loc[0]);
        pageUrls = pageUrls.concat(urls);
      }
    }

    console.log(`Total pages found: ${pageUrls.length}`);

    // Initialize Puppeteer browser
    const browser = await puppeteer.launch();

    const results = [];

    // Visit each page and count words
    for (const [index, pageUrl] of pageUrls.entries()) {
      console.log(`Processing (${index + 1}/${pageUrls.length}): ${pageUrl}`);
      const page = await browser.newPage();
      await page.goto(pageUrl, { waitUntil: 'networkidle2' });

      // Extract text content from the page
      const textContent = await page.evaluate(() => {
        return document.body.innerText;
      });

      // Count words
      const wordCount = textContent.trim().split(/\s+/).length;

      results.push({
        URL: pageUrl,
        'Word Count': wordCount,
      });

      await page.close();
    }

    await browser.close();

    // Write results to Excel file
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Word Counts');

    XLSX.writeFile(workbook, 'word_counts.xlsx');

    console.log('Word counts have been written to word_counts.xlsx');
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
