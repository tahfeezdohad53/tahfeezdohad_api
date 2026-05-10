import multer, { memoryStorage } from "multer";

const storage = memoryStorage();

async function audioFileFilter(req,file,cb){
    if(file.mimetype.startsWith('audio/')){
        return cb(null,true);
    }
    else return cb(new Error("file didn't matched"),false)
}

async function imageFileFilter(req,file,cb){
    console.log(file.mimetype)
    if(file.mimetype.startsWith('image/') || !file){
        return cb(null,true);
    }
    else return cb(new Error("file didn't matched"),false)
}

export const uploadAudio = multer({
    storage,
    fileFilter:audioFileFilter
})

export const uploadImage = multer({
    storage,
    fileFilter:imageFileFilter
})