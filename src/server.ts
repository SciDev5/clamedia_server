import express from "express"
import express_ws from "express-ws"
import { SONGINFO_STASH, TEMP_DATA_FOLDER } from "./song_loader"
import { Player } from "./player"
import { Connection } from "./connection"
const { app } = express_ws(express())

const player = new Player()

app.use((req, res, next) => {
    console.log(req.originalUrl);
    next()
})

app.ws("/ws", ws => {
    player.connections.add(new Connection(ws, player))
})

app.get("/song/:id", (req, res) => {
    const [, id] = req.params.id.match(/^(.*?)\.(?:webm|mp4)$/) ?? [null, req.params.id]
    console.log(id);

    if (/[^a-z0-9_-]/i.test(id)) {
        console.log("failed here");
        res.status(404).send("stop that")
        return
    }

    const data = SONGINFO_STASH.data.get(id)
    console.log(data);
    if (data == null) {
        res.status(404).send("song missing, try requesting it. also why are you using this endpoint directly lol get real")
        return
    }
    if (data.deleted) {
        res.status(404).send("deleted")
        return
    }
    if (data.failed) {
        res.status(404).send("failed")
        return
    }
    if (!data.loaded) {
        res.status(404).send("not yet loaded")
        return
    }
    res.sendFile(TEMP_DATA_FOLDER + "/" + id + "." + (data.format ?? "webm"), { root: process.cwd() })
})


const PORT = process.argv.map(v => {
    const [, p_str] = v.match(/^-p=(\d+)$/) ?? [null, null]
    if (p_str == null) return null
    const p = parseInt(p_str)
    if (p <= 0xffff) {
        return p
    }
}).find(v => v != null) ?? 3001
app.listen(PORT, () => {
    console.log(`listening [port: ${PORT}]`)
})