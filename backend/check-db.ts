import Database from 'better-sqlite3'

const db = new Database('./flowcart.db')
console.log('tables', db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all())
console.log('products', db.prepare('SELECT * FROM products').all())
db.close()
