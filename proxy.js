import net from "net";
import 'dotenv/config'
import * as osu from "osu-api-v2-js"
import * as http from "http"
import open from "open";

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID //need to include your discord application id
const OSU_API_CLIENT_ID = process.env.OSU_API_CLIENT_ID //create oath2 in your osu profile to get these two variables
const OSU_API_CLIENT_SECRET = process.env.OSU_API_CLIENT_SECRET
const FRIEND_OSU_ID = process.env.FRIEND_OSU_ID

const PIPE_NAME = "\\\\.\\pipe\\discord-ipc-1"; 
const FAKE_PIPE = "\\\\.\\pipe\\discord-ipc-0";
//const api = await osu.API.createAsync(OSU_API_CLIENT_ID, OSU_API_CLIENT_SECRET)

// create server on pipe 0
// connect to pipe 1 
// start listening
// find osu
// send modified osu to pipe1


// first test out having all proxy set up
// and then connect my personal client to the proxy
// and then having it show up as my status

// create a server that listens to the ipc pipe that discord uses and that all applications will send their data to
// after that has created print listening in terminal
const server = net.createServer().listen(FAKE_PIPE,()=>{console.log("listening")})
const client = await loopConnection(PIPE_NAME)

const redirect_uri = 'http://localhost:3000/callback'
const url = osu.generateAuthorizationURL(OSU_API_CLIENT_ID,'http://localhost:3000/callback',['friends.read', 'identify', 'public'],);
const code = await getCode(url)
const api = await osu.API.createAsync(OSU_API_CLIENT_ID, OSU_API_CLIENT_SECRET, {code, redirect_uri}, {verbose: "all"})
//const score = await api.getBeatmapUserScore(2561615,3180619)//2561615,3180619

//open connection to discord ipc server 
const OSU_ID = 367827983903490050; // this is osu's application id no need to worry 

const APPLICATION_HANDSHAKE = { v: 1, client_id: APPLICATION_ID };
// quick application connect to get handshake id
// const FAKE_HANDSHAKE = await new Promise((resolve,reject)=>
// {
//     const applicationClient = net.createConnection(PIPE_NAME, () => {
//         console.log("Connected to Discord IPC");
    
//         const handshake = { v: 1, client_id: APPLICATION_ID };
//         client.on("data", (buffer) => {
//             let offset = 0;
//             while (offset < buffer.length) {
//                 const opcode = buffer.readInt32LE(offset);
//                 const length = buffer.readInt32LE(offset + 4);
//                 const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
//                 try {
//                     const data = JSON.parse(jsonData);
//                     console.log("Discord Server Received:", data);
//                     applicationClient.end();
//                     resolve(buffer)
                    
//                 } catch (e) {
//                     console.log("Non-JSON data:", jsonData);
//                 }
//                 offset += 8 + length;
//             }
//                     //socket.write(buffer)
//         });
//         client.write(buildFrame(0, handshake)); // opcode 0 = handshake
    
//     });
//     applicationClient.on('error',reject)
// })

// console.log(FAKE_HANDSHAKE)


server.on('connection',async(socket) =>
    {

        socket.on("data", (buffer) => {
            let offset = 0;
            while (offset < buffer.length) {
                const opcode = buffer.readInt32LE(offset);
                const length = buffer.readInt32LE(offset + 4);
                const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
                try {
                    const data = JSON.parse(jsonData);
                    
                    console.log("My Server Received:", data);
                    //console.log(data.client_id)
                    if(data?.client_id == OSU_ID)
                    {
                        console.log("osu")
                        client.write(buffer)
                        // socket.write(FAKE_HANDSHAKE)
                        // return
                        //client.write(buildFrame(0, APPLICATION_HANDSHAKE));
                    }
                    else if(data?.evt == "ACTIVITY_SPECTATE" || data?.evt == "ACTIVITY_JOIN" || data?.evt == "ACTIVITY_JOIN_REQUEST" || data?.cmd == "SEND_ACTIVITY_JOIN_INVITE")
                    {
                        client.write(buffer)
                    }
                    else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.state == "Idle")
                    {
                        setActivityIdle(data.args.activity.assets.large_text)    
                    }
                    else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.secrets?.join)
                    {
                        setActivityInMulti(data.args.activity.details,data.args.activity.state,data.args.activity.assets.large_text,data.args.activity.party.size,data.args.activity.party,data.args.activity.secrets)
                    }
                    else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.state == "Clicking circles")
                    {
                        setActivityClicking(data.args.activity.details,data.args.activity.assets.large_text)    
                    }
                    else{
                        client.write(buffer)
                    }

                //     else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.state == "Looking for a game")
                //     {
                //         setActivityLookingForGame(data.args.activity.assets.large_text)    
                //     }
                //     else if(data?.cmd == "SET_ACTIVITY" && data?.args.activity.state == "AFK")
                //     {
                //         setActivityAFK(data.args.activity.assets.large_text)    
                //     }
                    
                 } catch (e) {
                    console.log("Non-JSON data:", jsonData);
                }
                offset += 8 + length; 
            }
            //client.write(buffer)
        });
        socket.on("close",()=>{
            client.destroy();
        })
        client.on("data", (buffer) => {
            let offset = 0;
            while (offset < buffer.length) {
                const opcode = buffer.readInt32LE(offset);
                const length = buffer.readInt32LE(offset + 4);
                const jsonData = buffer.subarray(offset + 8, offset + 8 + length).toString("utf8");
                try {
                    const data = JSON.parse(jsonData);
                    console.log("Discord Server Received:", data);
                    // if(data?.evt == "ACTIVITY_JOIN_REQUEST")
                    // {
                    //     data.data.activity.application_id=OSU_ID
                    //     const payload = buildFrame(1, data); 
                    //     socket.write(payload)
                    //     return
                    // }
                    if(data?.cmd== "SET_ACTIVITY")
                    {
                        return
                    }
                } catch (e) {
                    console.log("Non-JSON data:", jsonData);
                }
                offset += 8 + length;
            }
            socket.write(buffer)

        });
        client.on("close",()=>{
            socket.destroy();
        })
        
    }
)


async function loopConnection(PIPE_NAME){
    while (true){
        try{
            const client = await new Promise((resolve,reject)=>
            {
                const socket = net.createConnection(PIPE_NAME);
                socket.once("connect", ()=>resolve(socket));
                socket.once("error",reject);
            })
            console.log("connected");
            return client;
        }
        catch{
            console.log("retry")
            await new Promise((resolve,reject)=>
            {
                setTimeout(()=>
                {
                    resolve();
                }
                ,1000)
            })
        }
    }
}
// const client = await 





function buildFrame(opcode, payload) {
    const json = JSON.stringify(payload);
    const data = Buffer.from(json, "utf8");
    const frame = Buffer.alloc(8 + data.length);
    frame.writeInt32LE(opcode, 0); 
    frame.writeInt32LE(data.length, 4); 
    data.copy(frame, 8);
    return frame;
}


function setActivityIdle(large_text) {
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "Idle",
                details: "tech enjoyer",
                assets: {
                    large_image: "https://imgs.search.brave.com/WxyV9MqwtZie3vAyhcCET4KiN8z_LSV7jqMAutpF6Rc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50ZW5vci5jb20v/QXQtOXU5dVVZdlVB/QUFBTS9tdWRraXAt/cGlzc2luZy1tdWRr/aXAuZ2lm.gif",
                    large_text: "mudkip blicky",
                    small_image: "osu_logo",//osu-game-font
                    small_text: large_text
                },
                buttons: [
                    { label: "osu profile", url: "https://osu.ppy.sh/users/19266840" }
                ],
                instance: false
            }
        },
        nonce: Math.random().toString(36).substring(2)
    };
    client.write(buildFrame(1, payload)); 

}


async function setActivityClicking(details,large_text) {
    const [mapUrl,coverUrl,difficultyRating,mapBpm,mapLength,friendScore] = await searchBeatmap(details) 
    const time = Math.floor(Date.now() / 1000)
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "["+details+"]",
                details: "clicking?.circles",
                assets: {
                    large_image: coverUrl,
                    large_text: "map background",
                    small_image: "osu_logo",
                    small_text: large_text
                },
                buttons: [
                    //{ label: difficultyRating + "* | " + mapBpm +" bpm  | "  + formatTime(mapLength) +" mins", url: "https://www.youtube.com/watch?v=cG21b8Kx2DI" },
                    { label: "current map link", url: mapUrl}
                ],
                
                instance: false
            }
        },
        timestamps: {
            start: Math.floor(Date.now() / 1000),
            end: Math.floor(Date.now() / 1000) + mapLength
          },
        nonce: Math.random().toString(36).substring(2)
    };
    if(friendScore?.score?.id){
        payload.args.activity.buttons.push({ label: "watch out", url: "https://osu.ppy.sh/scores/"+friendScore.score.id })
    }
    else{
        payload.args.activity.buttons.push({ label: difficultyRating + "* | " + mapBpm +" bpm  | "  + formatTime(mapLength) +" mins", url: "https://www.youtube.com/watch?v=cG21b8Kx2DI" })
    }
    client.write(buildFrame(1, payload)); 

}

function setActivityLookingForGame(large_text) {
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "bottom text",
                details: "browsing multi",
                assets: {
                    large_image: "https://imgs.search.brave.com/WxyV9MqwtZie3vAyhcCET4KiN8z_LSV7jqMAutpF6Rc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50ZW5vci5jb20v/QXQtOXU5dVVZdlVB/QUFBTS9tdWRraXAt/cGlzc2luZy1tdWRr/aXAuZ2lm.gif",
                    large_text: "mudkip blicky",
                    small_image: "osu-game-font",
                    small_text: large_text
                },
                buttons: [
                    { label: "osu profile", url: "https://osu.ppy.sh/users/19266840" }
                ],
                instance: false
            }
        },
        nonce: Math.random().toString(36).substring(2)
    };
    client.write(buildFrame(1, payload)); 

}
function setActivityAFK(large_text) {
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "AFK",
                details: "placeholder",
                assets: {
                    large_image: "https://imgs.search.brave.com/WxyV9MqwtZie3vAyhcCET4KiN8z_LSV7jqMAutpF6Rc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50ZW5vci5jb20v/QXQtOXU5dVVZdlVB/QUFBTS9tdWRraXAt/cGlzc2luZy1tdWRr/aXAuZ2lm.gif",
                    large_text: "mudkip blicky",
                    small_image: "osu-game-font",
                    small_text: large_text
                },
                buttons: [
                    { label: "osu profile", url: "https://osu.ppy.sh/users/19266840" }
                ],
                instance: false
            }
        },
        nonce: Math.random().toString(36).substring(2)
    };
    client.write(buildFrame(1, payload)); 

}

async function setActivityInMulti(songName,gameName,large_text,partySize,osuParty,osuSecrets) {
    let mapUrl,coverUrl,difficultyRating,mapBpm,mapLength;
    if(songName)  {[mapUrl,coverUrl,difficultyRating,mapBpm,mapLength] = await searchBeatmap(songName)}
    if(!songName){
        songName = "choosing a song"
        coverUrl = "https://imgs.search.brave.com/WxyV9MqwtZie3vAyhcCET4KiN8z_LSV7jqMAutpF6Rc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS50ZW5vci5jb20v/QXQtOXU5dVVZdlVB/QUFBTS9tdWRraXAt/cGlzc2luZy1tdWRr/aXAuZ2lm.gif"
    }


    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                state: "["+songName+']',
                details: "in lobby ("+partySize[0]+" of "+partySize[1]+"): " +gameName,
                assets: {
                    large_image: coverUrl,
                    large_text: "map background",
                    small_image: "osu_logo",
                    small_text: large_text
                },
                // buttons: [
                //     { label: "osu profile", url: "https://osu.ppy.sh/users/19266840" }
                // ],
                party:osuParty,
                secrets:osuSecrets,

                instance: false
            }
        },
        nonce: Math.random().toString(36).substring(2)
    };
    client.write(buildFrame(1, payload)); 

}
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  

// TODO: more robust error handling + default map fall back on error 
async function searchBeatmap(q) {
    const placeHolder = "https://osu.ppy.sh/beatmapsets/1073074#osu/2245783"
    const query = q.match(/-\s*(.*?)\s*\[/)[1]
    try {
        const results = await api.searchBeatmapsets({ keywords: query, mode: "osu", categories:"Any"});

        if (!results.beatmapsets || results.beatmapsets.length === 0) {
            console.log("No beatmaps found for query:", query);
            return placeHolder;
        }

        //const beatmapset = results.beatmapsets[1];
        const targetVersion = q.match(/\[(.*?)\]/)[1]

        for(const beatmapset of results.beatmapsets.slice(0,10)){
            //console.log(beatmapset)
            for(const beatmap of beatmapset.beatmaps)
            {
                //console.log(beatmap.version)
                if(beatmap.version==targetVersion)
                {
                    let score;
                    try{

                        score = await api.getBeatmapUserScore(beatmap.id,+FRIEND_OSU_ID)
                        //console.log(score)
                    }
                    catch(err){
                        console.log(err)
                    }
                    return [beatmap.url,beatmapset.covers['list@2x'],beatmap.difficulty_rating,beatmap.bpm,beatmap.total_length,score]
                }
            }
        }
        try{
            const queryWithArtist = q.match(/^(.*?)\s*\[/)[1];
            const results = await api.searchBeatmapsets({ keywords: queryWithArtist, mode: "osu", categories:"Any"});

            if (!results.beatmapsets || results.beatmapsets.length === 0) {
                console.log("No beatmaps found for query:", query);
                return placeHolder;
            }

            //const beatmapset = results.beatmapsets[1];
            const targetVersion = q.match(/\[(.*?)\]/)[1]

            for(const beatmapset of results.beatmapsets.slice(0,10)){
                //console.log(beatmapset)
                for(const beatmap of beatmapset.beatmaps)
                {
                    //console.log(beatmap.version)
                    if(beatmap.version==targetVersion)
                    {
                        let score;
                        try{

                            score = await api.getBeatmapUserScore(beatmap.id,+FRIEND_OSU_ID)
                            //console.log(score)
                        }
                        catch{
                        
                        }
                        return [beatmap.url,beatmapset.covers['list@2x'],beatmap.difficulty_rating,beatmap.bpm,beatmap.total_length,score]
                    }
                }
            }
        }
        catch{}
        return placeHolder

    } catch (err) {
        console.error("Error searching for beatmap:", err);
        return placeHolder;
    }
}

async function getCode(authorization_url){
    // Open a temporary server to receive the code when the browser is sent to the redirect_uri after confirming authorization
    const httpserver = http.createServer()
    const host = redirect_uri.substring(redirect_uri.indexOf("/") + 2, redirect_uri.lastIndexOf(":"))
    const port = Number(redirect_uri.substring(redirect_uri.lastIndexOf(":") + 1).split("/")[0])
    httpserver.listen({host, port})
  
    // Open the browser to the page on osu!web where you click a button to say you authorize your application
    console.log("Waiting for code...")
    const command = (process.platform == "darwin" ? "open" : process.platform == "win32" ? "start" : "xdg-open")
    //exec(`${command} "${authorization_url}"`)
    open(url)
  
    // Check the URL for a `code` GET parameter, get it if it's there
    const code= await new Promise((resolve) => {
      httpserver.on("request", (request, response) => {
        if (request.url) {
          console.log("Received code!")
          response.end("Worked! You may now close this tab.", "utf-8")
          httpserver.close() // Close the temporary server as it is no longer needed
          resolve(request.url.substring(request.url.indexOf("code=") + 5))
        }
      })
    })
    return code
  }