import { SongInfo, SMsg, SMsgEnqueue, SMsgPausePlay, SMsgSeek, SMsgVolume, SMsgQueueChange, SMSG_KEY, SMsgSkip, CMSG_KEY, CMsg, SMsgReqSync, SMsgNext } from "./connection_types";
import { WebSocket } from "ws"
import { is_arr, is_bool, is_dict, is_in_union, is_literal, is_number, is_str, is_tuple, try_parse_json } from "./json";
import { Player } from "./player";

export const is_SongInfo = is_dict({
    name: is_str,
    loaded: is_bool,
}) as (v: unknown) => v is SongInfo


const is_msg_video_change = is_tuple<SMsgEnqueue>([is_literal(SMSG_KEY.ENQUEUE), is_str])
const is_msg_skip = is_tuple<SMsgSkip>([is_literal(SMSG_KEY.SKIP)])
const is_msg_next = is_tuple<SMsgNext>([is_literal(SMSG_KEY.NEXT), is_number])
const is_msg_pauseplay = is_tuple<SMsgPausePlay>([is_literal(SMSG_KEY.PAUSEPLAY), is_bool])
const is_msg_seek = is_tuple<SMsgSeek>([is_literal(SMSG_KEY.SEEK), is_number])
const is_msg_volume = is_tuple<SMsgVolume>([is_literal(SMSG_KEY.VOLUME), is_number])
const is_msg_queue_change = is_tuple<SMsgQueueChange>([is_literal(SMSG_KEY.QUEUE_CHANGE), is_arr(is_str)])
const is_msg_req_syc = is_tuple<SMsgReqSync>([is_literal(SMSG_KEY.REQ_SYNC)])
const is_msg = is_in_union<SMsg>(
    [is_msg_video_change, is_msg_skip, is_msg_next, is_msg_pauseplay, is_msg_seek, is_msg_volume, is_msg_queue_change, is_msg_req_syc]
)

export class Connection {
    private readonly on_message = (raw_data: string) => {
        const data = try_parse_json(raw_data, is_msg)
        if (data == null) {
            console.warn("received invalid message", raw_data)
            return
        }
        switch (data[0]) {
            case SMSG_KEY.ENQUEUE:
                this.player.req_enqueue(data[1])
                break
            case SMSG_KEY.SKIP:
                this.player.req_skip()
                break
            case SMSG_KEY.NEXT:
                this.player.req_next(data[1])
                break
            case SMSG_KEY.PAUSEPLAY:
                this.player.req_pauseplay(data[1])
                break
            case SMSG_KEY.SEEK:
                this.player.req_seek(data[1])
                break
            case SMSG_KEY.VOLUME:
                this.player.req_volume(data[1])
                break
            case SMSG_KEY.QUEUE_CHANGE:
                this.player.req_queuechange(data[1])
                break
            case SMSG_KEY.REQ_SYNC:
                this.player.sync_connection(this)
                break
        }
    }

    send(msg: CMsg) {
        this.ws.send(JSON.stringify(msg))
    }

    send_video_change(id: string | null, discriminator: number) { this.send([CMSG_KEY.VIDEO_CHANGE, id, discriminator]) }
    send_pauseplay(playing: boolean) { this.send([CMSG_KEY.PAUSEPLAY, playing]) }
    send_seek(time: number) { this.send([CMSG_KEY.SEEK, time]) }
    send_volume(volume: number) { this.send([CMSG_KEY.VOLUME, volume]) }
    send_queue_change(new_queue: string[]) { this.send([CMSG_KEY.QUEUE_CHANGED, new_queue]) }
    send_songinfo(id: string, songinfo: SongInfo) { this.send([CMSG_KEY.SONG_INFO, id, songinfo]) }


    constructor(
        readonly ws: WebSocket,
        private readonly player: Player,
    ) {
        ws.on("message", this.on_message)
    }
    drop() {
        this.ws.close()
    }
}
