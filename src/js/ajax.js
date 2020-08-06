const Ajax = param => {
    return new Promise((resolve)=>{
        let {method = 'POST',url,headers,data,onProgress,requestList} = param
        let xhr = new XMLHttpRequest()
        xhr.onprogress = onProgress
        xhr.open(method,url)
        if(headers){
            Object.keys(headers).forEach((key)=>{
                xhr.setRequestHeader(key,headers[key])
            })
        }
        xhr.onload = (e) =>{
            if(requestList){
                let currXhr = requestList.findIndex(item => item === xhr)
                requestList.splice(currXhr,1)
            }
            resolve({
                data:e.target.response
            })
            requestList?.push(xhr)
        }
        xhr.send(data)
    })
}

export default Ajax