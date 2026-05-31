const giphyService = require("../services/giphy-service");

exports.getTrendingGifs = async(req,res)=>{
    try{
        const gifs = await giphyService.getTrendingGifs();
        res.status(200).json(gifs);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }

}

exports.getGifsBySearch = async(req,res)=>{
    try{
        const query = req.query.q;
        const gifs = await giphyService.getGifsBySearch(query);
        res.status(200).json(gifs);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }   
}

exports.getTrendingStickers = async(req,res)=>{
    try{
        const stickers = await giphyService.getTrendingStickers();
        res.status(200).json(stickers);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
}

exports.getStickersBySearch = async(req,res)=>{
    try{
        const query = req.query.q;
        const gifs = await giphyService.getStickersBySearch(query);
        res.status(200).json(gifs);
    }
    catch(error){
        res.status(500).json({error:error.message});
    } 
}