const AccessControl = require("../models/access-control");
const { client: redisClient } = require("../utils/redis");

const ACCESS_CONTROL_CACHE_KEY = "cfg:access_control";
const ACCESS_CONTROL_TTL = 60 * 5; // 5 minutes — refresh after admin changes

async function getAccessControl() {
  const cached = await redisClient.get(ACCESS_CONTROL_CACHE_KEY).catch(() => null);
  if (cached) return JSON.parse(cached);

  const doc = await AccessControl.findOne().lean();
  if (doc) {
    await redisClient.set(ACCESS_CONTROL_CACHE_KEY, JSON.stringify(doc), "EX", ACCESS_CONTROL_TTL).catch(() => {});
  }
  return doc;
}

exports.invalidateAccessControlCache = async () => {
  await redisClient.del(ACCESS_CONTROL_CACHE_KEY).catch(() => {});
};

exports.canAccess = async (email) => {
    const emailDomain = email.split('@')[1];
    const disableWhitelist = process.env.DISABLE_ACCESS_WHITELIST === 'true';

    const accessControl = await getAccessControl();
    if (!accessControl) {
        return true;
    }

    const { whiteList, blackList } = accessControl;

    if (blackList.domains.includes(emailDomain) || blackList.emails.includes(email)) {
        return false;
    }

    if (disableWhitelist) {
        return true;
    }

    // Case: Both whitelist domains and emails are present
    if (whiteList.domains.length > 0 && whiteList.emails.length > 0) {
        return (whiteList.domains.includes(emailDomain) || whiteList.emails.includes(email)) ? true : false;
    }

    // Case: Only whitelist domains are present
    if (whiteList.domains.length > 0) {
        if (whiteList.domains.includes(emailDomain)) {
            return (blackList.emails.length > 0 && blackList.emails.includes(email)) ? false : true;
        }
        return false;
    }

    // Case: Only whitelist emails are present
    if (whiteList.emails.length > 0) {
        if (whiteList.emails.includes(email)) {
            return (blackList.domains.length > 0 && blackList.domains.includes(emailDomain)) ? false : true;
        }
        return false;
    }

    return true;
};
