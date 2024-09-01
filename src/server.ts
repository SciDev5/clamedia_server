import express from "express"
import express_ws from "express-ws"
const { app } = express_ws(express())

app.ws("/", ws => {
    ws.send("hello world")
    setTimeout(() => {
        ws.close()
    }, 1000)
})

app.listen(3001, () => {
    console.log("listening")
})