const path = require('path');
const os = require('os');

// Environment Variables
const homeDir = os.homedir();
const mediaPath = homeDir;
const dotenv = require('dotenv')
dotenv.config();
const env = process.env.ENV
let themesFolderPath = ''
let DOMAIN = ''
if(env === 'docker'){
  themesFolderPath= path.join(__dirname, '/assets/images/background_images');
  DOMAIN = getDomainFromUrl(process.env.UI_BASE_URL || 'http://localhost:4200');
}else{
  themesFolderPath = path.join(__dirname, '../frontend/src/assets/images/background_images');
}

function getDomainFromUrl(url) {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname;
}

const eventpath = path.join(__dirname, 'events');

// Service base URL
const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL || 'http://localhost:5000';

// UI base URL
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:4200';

// NGINX base URL
const NGINX_BASE_URL = process.env.NGINX_BASE_URL || UI_BASE_URL;

// Number of documents per page
const WALL_PAGE_SIZE = 24;

const POST_PAGE_SIZE = 12;

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";

const SOCKET_PATH = process.env.SOCKET_PATH || (SERVICE_BASE_URL.includes('localhost') ? '/socket.io' : '/momentaapi/socket.io');

module.exports = {
  homeDir,
  mediaPath,
  themesFolderPath,
  eventpath,
  DOMAIN,
  SERVICE_BASE_URL,
  UI_BASE_URL,
  NGINX_BASE_URL,
  WALL_PAGE_SIZE,
  POST_PAGE_SIZE,
  GIPHY_API_KEY,
  SOCKET_PATH
};
