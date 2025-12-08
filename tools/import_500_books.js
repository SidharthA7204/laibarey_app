// tools/import_500_books.js
// Run: node tools/import_500_books.js
// This script fetches books from OpenLibrary search and stores up to TARGET_COUNT
// into the local SQLite database at ./database.db. It skips books that are recorded
// in the deleted_books table to respect permanent deletions.

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, '..', 'database.db');
const TARGET_COUNT = 500;
const PAGE_SIZE = 100; // OpenLibrary supports up to 100 per page
const QUERY = 'programming'; // change query as needed

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async function main(){
  console.log('Importer starting — target:', TARGET_COUNT);
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found at', DB_PATH);
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH);

  // helper to run a single-row get as Promise
  function getAsync(sql, params){
    return new Promise((resolve, reject)=>{
      db.get(sql, params, (err,row)=>{ if(err) reject(err); else resolve(row); });
    });
  }
  function runAsync(sql, params){
    return new Promise((resolve, reject)=>{
      db.run(sql, params, function(err){ if(err) reject(err); else resolve(this); });
    });
  }

  try{
    // count current number of books
    const row = await getAsync('SELECT COUNT(*) AS c FROM books', []);
    let have = row ? row.c : 0;
    console.log('Currently in DB:', have);
    if (have >= TARGET_COUNT) {
      console.log('Target already satisfied. Exiting.');
      db.close();
      return;
    }

    // fetch pages until we collect TARGET_COUNT new entries (or run out)
    let page = 1;
    let pagesWithoutNew = 0;
    while (have < TARGET_COUNT) {
      console.log(`Fetching OpenLibrary page ${page} ...`);
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(QUERY)}&page=${page}&limit=${PAGE_SIZE}`;
      let data;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
      } catch (err) {
        console.error('Fetch error:', err.message);
        await sleep(1000);
        continue;
      }

      const docs = data.docs || [];
      if (!docs.length) {
        console.log('No docs returned; stopping.');
        break;
      }

      let newThisPage = 0;
      for (const doc of docs) {
        if (have >= TARGET_COUNT) break;

        const title = doc.title || null;
        const author = (doc.author_name && doc.author_name[0]) || null;
        const isbn = (doc.isbn && doc.isbn[0]) || null;
        const year = doc.first_publish_year || null;
        const category = (doc.subject && doc.subject[0]) || null;
        const image = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;

        // skip if in deleted_books
        const deleted = await getAsync('SELECT id FROM deleted_books WHERE isbn = ? OR (title = ? AND author = ?)', [isbn, title, author]);
        if (deleted) continue;

        // skip if already in books (by isbn if present, else title+author)
        let exists;
        if (isbn) exists = await getAsync('SELECT id FROM books WHERE isbn = ? LIMIT 1', [isbn]);
        else exists = await getAsync('SELECT id FROM books WHERE title = ? AND author = ? LIMIT 1', [title, author]);
        if (exists) continue;

        // insert
        try {
          await runAsync(
            `INSERT INTO books (title, author, isbn, category, image, year, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, author, isbn, category, image, year, 1, 1]
          );
          have++;
          newThisPage++;
          if (have % 50 === 0) console.log('Inserted so far:', have);
        } catch (err) {
          console.error('Insert error:', err.message);
        }
      }

      if (newThisPage === 0) pagesWithoutNew++; else pagesWithoutNew = 0;
      if (pagesWithoutNew >= 5) {
        console.log('No new items in last 5 pages; stopping to avoid infinite loop.');
        break;
      }

      page++;
      // polite delay to avoid hammering API
      await sleep(300);
    }

    console.log('Importer finished. Total in DB:', have);
  } catch (err) {
    console.error('Importer failed:', err);
  } finally {
    db.close();
  }
})();
