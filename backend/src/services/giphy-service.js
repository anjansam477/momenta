const {GIPHY_API_KEY} = require("../../environment-config");
const axios = require('axios');
const { getAsync, setAsync , hgetAsync, hsetAsync} = require('../utils/redis');

class GiphyService{
    threshold = 5;

    async getTrendingGifs(){
        const cacheKey = 'trending_gifs';
        const cachedData = await getAsync(cacheKey);

        if (cachedData) {
        const data =  JSON.parse(cachedData);
        return this.getRandomItems(data.data, 30);
        }

        const data = await this.fetchFromGiphy(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=100`);
        await setAsync(cacheKey, JSON.stringify(data), 'EX', 86400); //expires daily
        return this.getRandomItems(data.data, 30);
    }

    async getGifsBySearch(query) {
        const searchCountKey = 'searchedGif';
        const searchCount = await hgetAsync(searchCountKey, query);
    
        if (searchCount) {
            const [count] = searchCount.split(':').map(Number);
            if (count >= this.threshold) {
                const cachedData = await getAsync(`search_gifs_${query}`);
                if (cachedData) {
                    const data = JSON.parse(cachedData);
                    return this.getRandomItems(data.data, 30);
                }
            }
        }
        const limit = (searchCount && parseInt(searchCount.split(':')[0], 10) == this.threshold-1) ? 100 : 30;
        const data = await this.fetchFromGiphy(`https://api.giphy.com/v1/gifs/search?q=${query}&api_key=${GIPHY_API_KEY}&limit=${limit}`);
        const newCount = searchCount ? parseInt(searchCount.split(':')[0], 10) + 1 : 1;
        const currentTimestamp = Math.floor(Date.now() / 1000);
    
        await hsetAsync(searchCountKey, query, `${newCount}:${currentTimestamp}`);
    
        if (newCount >= this.threshold) {
            await setAsync(`search_gifs_${query}`, JSON.stringify(data), 'EX', 604800); // expires weekly (7 days)
            return this.getRandomItems(data.data, 30); // Return 30 random items from the 100 fetched
        }
        return data.data; // Return the 30 fetched items directly
    }
    
    

    async getTrendingStickers(){
        const cacheKey = 'trending_stickers';
        const cachedData = await getAsync(cacheKey);

        if (cachedData) {
        const data = JSON.parse(cachedData);
        return this.getRandomItems(data.data, 30);
        }

        const data = await this.fetchFromGiphy(`https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=100`);
        await setAsync(cacheKey, JSON.stringify(data), 'EX', 86400);   //expires daily
        return this.getRandomItems(data.data, 30);
    }

    async getStickersBySearch(query){
        const searchCountKey = 'searchedSticker';
        const searchCount = await hgetAsync(searchCountKey, query);

        if (searchCount) {
            const [count] = searchCount.split(':').map(Number);
            if (count >= this.threshold) {
                const cachedData = await getAsync(`search_stickers_${query}`);
                if (cachedData) {
                    const data = JSON.parse(cachedData);
                    return this.getRandomItems(data.data, 30);
                }
            }
        }
        const limit = (searchCount && parseInt(searchCount.split(':')[0], 10) == this.threshold-1) ? 100 : 30;
        const data = await this.fetchFromGiphy(`https://api.giphy.com/v1/stickers/search?q=${query}&api_key=${GIPHY_API_KEY}&limit=${limit}`);
        const newCount = searchCount ? parseInt(searchCount.split(':')[0], 10) + 1 : 1;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        await hsetAsync(searchCountKey, query, `${newCount}:${currentTimestamp}`);

        if (newCount >= this.threshold) {
            await setAsync(`search_stickers_${query}`, JSON.stringify(data), 'EX', 604800); //expires weekly
            return this.getRandomItems(data.data, 30);
        }
        return data.data; // Return the 30 fetched items directly
    }

    async fetchFromGiphy(url) {
        try {
          if (!GIPHY_API_KEY) {
            throw new Error('GIPHY_API_KEY is not configured');
          }
          const response = await axios.get(url);
          return response.data;
        } catch (error) {
          throw new Error(error.message);
        }
    }

    getRandomItems(array, count) {
        const result = [];
        const len = array.length;

        // Fisher-Yates shuffle
        for (let i = len - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }

        for (let i = 0; i < count; i++) {
            result.push(array[i]);
        }

        return result;
    }
}

module.exports = new GiphyService();
