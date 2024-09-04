import { readdirSync } from "fs"
import { Connection } from "./connection"
import { download_video, TEMP_DATA_FOLDER } from "./song_loader"
import { SongInfo } from "./connection_types"

export class Player {
    readonly connections = new Set<Connection>()
    readonly queue: string[] = []
    readonly cached: Map<string, SongInfo> = new Map(
        readdirSync(TEMP_DATA_FOLDER)
            .filter(v => v.endsWith(".webm"))
            .map(v => v.substring(0, v.length - ".webm".length))
            .map(id => [id, { name: id, loaded: true }])
    )
    current_song: string | null = null
    current_song_discriminator: number = 0
    is_playing: boolean = true
    // when playing, is the time it started, when paused is the duration it has been playing
    play_time: number = 0.0
    volume: number = 1.0

    async req_enqueue(song_id: string) {
        const cached = this.cached.get(song_id)
        if (cached == null) {
            const song_info: SongInfo = { name: song_id, loaded: false }
            this.connections.forEach(v => (
                v.send_songinfo(song_id, song_info)
            ))
            this.cached.set(song_id, song_info)
            await download_video(song_id)
            song_info.loaded = true
            this.connections.forEach(v => (
                v.send_songinfo(song_id, song_info)
            ))
            this.queue.push(song_id)
            this.connections.forEach(v => (
                v.send_queue_change(this.queue)
            ))
            if (this.current_song === null) {
                this.shift_queue()
            }
        } else if (cached.loaded) {
            this.queue.push(song_id)
            this.connections.forEach(v => (
                v.send_queue_change(this.queue)
            ))
            if (this.current_song === null) {
                this.shift_queue()
            }
        } else {
            // this will break if trying to double queue something before its finished downloading
        }
    }
    async req_skip() {
        this.shift_queue()
    }
    /// from_id is used to make skips idempotent
    async req_next(from_discriminator: number) {
        if (this.current_song_discriminator === from_discriminator) {
            this.shift_queue()
        }
    }
    async req_pauseplay(playing: boolean) {
        this.set_playing(playing)
    }
    async req_seek(time: number) {
        this.seek(time)
    }
    async req_volume(volume: number) {
        this.volume = volume
        this.connections.forEach(v => {
            v.send_volume(this.volume)
        })
    }
    async req_queuechange(new_queue: string[]) {
        this.queue.splice(0, Infinity, ...new_queue.filter(id => this.cached.has(id)))
    }

    private set_playing(playing: boolean) {
        if (this.is_playing === playing) return
        this.is_playing = playing
        if (this.is_playing) {
            // started playing
            this.play_time = Date.now() - this.play_time
        } else {
            // stopped playing
            this.play_time = this.play_time - Date.now()
        }
        this.connections.forEach(v => {
            v.send_pauseplay(this.is_playing)
        })
    }
    private seek(time: number) {
        if (this.is_playing) {
            this.play_time = Date.now() - time
        } else {
            this.play_time = Date.now() - time
        }
        this.connections.forEach(v => {
            v.send_seek(time)
        })
    }
    private shift_queue() {
        this.current_song = this.queue.shift() ?? null
        this.current_song_discriminator = (
            this.current_song_discriminator
        ) | 0 // modulo 4.3 billion
        this.connections.forEach(v => {
            v.send_video_change(this.current_song, this.current_song_discriminator)
            v.send_queue_change(this.queue)
        })
        this.seek(0)
    }

    sync_connection(conn: Connection) {
        for (const [id, info] of this.cached) {
            conn.send_songinfo(id, info)
        }
        conn.send_volume(this.volume)
        conn.send_pauseplay(this.is_playing)
        conn.send_queue_change(this.queue)
        conn.send_video_change(this.current_song, this.current_song_discriminator)
        conn.send_seek(this.is_playing
            ? Date.now() - this.play_time
            : this.play_time)
    }
}