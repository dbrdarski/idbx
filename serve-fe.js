import { read, match } from './src/index';
import { objectStore, arrayStore, stringStore, matchType } from './src/stores.js'

window.allStores = { objectStore, arrayStore, stringStore, matchType };
window.read = read;
window.match = match;

console.log('Hello world');
