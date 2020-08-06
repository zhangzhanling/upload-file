
const multiparty = require('multiparty')
const fs = require('fs-extra')
const path = require('path')
const UPLOAD_DIR = path.resolve(__dirname,'..','target')

class Controller{
    async handleFormData(req,res){
        const form = new multiparty.Form()
        form.parse(req, async (err,fileds,files)=> {
            if(err){
                res.status = 500
                res.end('file failed')
                return
            }
            let [chunk] = files.chunk
            let [hash] = fileds.hash
            let [fileHash] = fileds.fileHash
            let [fileName] = fileds.fileName
            // 文件路径 target/hash.ext
            let filePath = path.resolve(UPLOAD_DIR,fileName)
            // 如果文件已经存在，则退出
            if(fs.existsSync(filePath)){
                res.end(JSON.stringify({
                    code:'000',
                    msg:'file exist'
                }))
                return 
            }
             // 目录路径 target/hash
             let chunkDir = path.resolve(UPLOAD_DIR,fileHash)
            // 如果文件夹不存在，创建一个文件夹
            if(!fs.existsSync(chunkDir)){
                await fs.mkdirs(chunkDir)
            }
            await fs.move(chunk.path,`${chunkDir}/${hash}`)
            res.end(
                JSON.stringify({
                    code:'111',
                    msg:'file success'
                })
            )
        })
    }
    // 合并切片接口
    async handleMerge(req,res){
        let fileData = await resolvePost(req)
        let {fileName,fileHash,size} = fileData
        // 文件路径 target/hash.ext
        let filePath = path.resolve(UPLOAD_DIR,fileName)
        //let newName = fileName.split('.')[0]
        await mergeFile(filePath,fileHash,size)
        res.end(JSON.stringify({
            code:0,
            message:'file merge success'
        }))
    }
    // 验证接口
    async handleVerify(req,res){
        let file = await resolvePost(req)
        let ext = extractExt(file.fileName)
        let filePath = path.resolve(UPLOAD_DIR,`${file.fileHash}${ext}`)
        if(fs.existsSync(filePath)){
            res.end(
                JSON.stringify({
                    shouldUpload:false
                })
            )    
        }else{
            res.end(
                JSON.stringify({
                    shouldUpload:true,
                    uploadedList: await createUploadList(file.fileHash)
                })
            )
        }
    }
}

// 解析传入的请求
const resolvePost = async (req)=>{
    return new Promise((resolve)=>{
        let chunk = ''
        req.on('data',(data)=>{
            chunk += data
        })
        req.on('end',async ()=>{
            if(chunk){
                await resolve(JSON.parse(chunk))
            }
        })
    })
}

// 读取切片写入文件
const pipeStream = (path,writeStream)=>{
    new Promise(async (resolve)=>{
        // 读取每一项切片 target/hash/xx.ext
        let readStream = fs.createReadStream(path)
        readStream.on('end',()=>{
            // 删除切片文件
            fs.removeSync(path)
            resolve()
        })
        // 将读取的切片写入到创建的文件中
        await readStream.pipe(writeStream)
    })
}

// 解析文件后缀
const extractExt = (filename) => {
    return filename.slice(filename.lastIndexOf("."), filename.length)
}

// 返回已上传的文件
const createUploadList = async (fileHash) => {
    // 如果目录存在，则读取目录中文件，并返回 target/hash
    let res = fs.existsSync(path.resolve(UPLOAD_DIR,fileHash)) 
    ? await fs.readdir(path.resolve(UPLOAD_DIR.fileHash))
    : []
    return res
}

// 合并切片
const mergeFile = async (filePath,fileHash,size)=>{
    // 解析出目录 比如:target/hash
    let chunkDir = path.resolve(UPLOAD_DIR,fileHash)
    // 读取目录的文件
    let chunkPaths = await fs.readdir(chunkDir)
    // 将目录中的文件排序
    chunkPaths.sort((a,b)=>{
        return a.split('-')[1] - b.split('-')[1]
    })
    // 遍历目录中的文件
    await Promise.all(
        chunkPaths.map( async (chunkPath,index)=>{
            await pipeStream(
                path.resolve(chunkDir,chunkPath),
                fs.createWriteStream(filePath,{
                    start:index*size,
                    end:(index+1)*size
                })
            )
        })
    )
    // 删除之前保存切片的目录
    fs.remove(chunkDir)
}

const controller = new Controller()

module.exports = {
    handleMerge:controller.handleMerge,
    handleFormData:controller.handleFormData,
    handleVerify:controller.handleVerify
}