
const http = require('http')
const app = http.createServer()
const controller = require('./controller')
const port = 3000

// 监听前端请求
app.on('request', async (req,res) => {
    setCORS(res)
    if (req.method === "OPTIONS") {
        res.status = 200;
        res.end();
        return
    }
    // 合并切片
    if(req.url === '/merge'){
        await controller.handleMerge(req,res)
        return
    }
    // 验证是否上传
    if(req.url === '/verify'){
        await controller.handleVerify(req,res)
        return
    }
    // 上传
    if(req.url === '/'){
        await controller.handleFormData(req,res)
    }

})

// 设置跨域
function setCORS(res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))