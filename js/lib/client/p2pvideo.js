var P2PEvents = {
    /**
     * Emitted when segment has been downloaded.
     * Args: segment
     */
    SegmentLoaded : "segment_loaded",

    /**
     * Emitted when an error occurred while loading the segment.
     * Args: segment, error
     */
    SegmentError : "segment_error",


    /**
     * Emitter when we the segment size is known
     * Args: segment, size
     */
    SegmentSize : "segment_size",

    /**
     * Emitted for each segment that does not hit into a new segments queue when the load() method is called.
     * Args: segment
     */
    SegmentAbort : "segment_abort",


    /**
     * Emitted when the loader started to load a segment
     * Args: method, segment
     */
    SegmentStartLoad : "segment_start_load",

    /**
     * Emitted when a peer is connected.
     * Args: peer
     */
    PeerConnect : "peer_connect",

    /**
     * Emitted when a peer is disconnected.
     * Args: peerId
     */
    PeerClose : "peer_close",

    /**
     * Emitted when a segment piece has been downloaded.
     * Args: method (can be "http" or "p2p" only), bytes
     */
    PieceBytesDownloaded : "piece_bytes_downloaded",

    /**
     * Emitted when a segment piece has been uploaded.
     * Args: method (can be "p2p" only), bytes
     */
    PieceBytesUploaded : "piece_bytes_uploaded",
}

var getRtcConfig = function () {
    return {
        iceServers: [
            {
              urls: "stun:turn.pocketnet.app",
              username: "stunuser",
              credential: "q1w2e3r4t5ASD!@#",
            },
            {
              urls: "turn:turn.pocketnet.app",
              username: "stunuser",
              credential: "q1w2e3r4t5ASD!@#",
            },
        ]
    }
}

var MediaPeerSegmentStatus = {
    Loaded : 0,
    LoadingByHttp : 1
}

class P2PManager  {
    constructor(segmentsStorage, info) {


        this.masterSwarmId = info.masterSwarmId
        this.streamSwarmId = info.streamSwarmId
        this.segmentsStorage = segmentsStorage

        this.p2pManager = this.createManager(info.trackerUrls)
        

        this.events()


        this.p2pManager.setStreamSwarmId(this.streamSwarmId, this.masterSwarmId);
    }


    createManager = function(trackerAnnounce){
        return new window.P2PMediaManager(this.segmentsStorage, {
            useP2P : true,
            rtcConfig : getRtcConfig(),
            peerRequestsPerAnnounce : 10,
            p2pSegmentDownloadTimeout: 60000,
            webRtcMaxMessageSize : 64 * 1024 - 1,
            trackerAnnounce: trackerAnnounce
        })
    }

    getStreamSwarmId = (segment) => {
        return segment.streamId === undefined ? segment.masterSwarmId : `${segment.masterSwarmId}+${segment.streamId}`;
    };

    createSegmentsMap = (storageSegments) => {

        var segmentsMap = {};

        const addSegmentToMap = (segment, status) => {
            const streamSwarmId = this.getStreamSwarmId(segment);
            const segmentId = segment.sequence;

            let segmentsIdsAndStatuses = segmentsMap[streamSwarmId];
            if (segmentsIdsAndStatuses === undefined) {
                segmentsIdsAndStatuses = ["", []];
                segmentsMap[streamSwarmId] = segmentsIdsAndStatuses;
            }
            const segmentsStatuses = segmentsIdsAndStatuses[1];
            segmentsIdsAndStatuses[0] += segmentsStatuses.length === 0 ? segmentId : `|${segmentId}`;
            segmentsStatuses.push(status);
        };


        for (const storageSegment of storageSegments.values()) {
            addSegmentToMap(storageSegment.segment, MediaPeerSegmentStatus.Loaded);
        }


        return segmentsMap;
    };

    sendmap = async function(peerid){
        var map = this.createSegmentsMap(await this.segmentsStorage.getSegmentsMap(this.masterSwarmId))


        if(!peerid){
            this.p2pManager.sendSegmentsMapToAll(map);
        }
        else{
            this.p2pManager.sendSegmentsMap(
                peerid,
                map
            );
        }
    }

    emit = function(e, data){
    }

    events = function(){

        this.p2pManager.on("peer-data-updated", async (d) => {
            this.sendmap()
        });

        this.p2pManager.on("peer-connected", async (peer) => {

            this.emit(P2PEvents.PeerConnect, peer);


            this.sendmap(peer.id)
    
          
        });

        this.p2pManager.on("peer-closed", (peerId) => {
            this.emit(P2PEvents.PeerClose, peerId);
        });

        this.p2pManager.on("tracker-update", async (data) => {
            if (
                data.incomplete !== undefined &&
                data.incomplete <= 1
            ) {
                this.sendmap()
            }
        });

        this.p2pManager.on("bytes-downloaded", (segment, bytes, peerId) => {
            this.emit(P2PEvents.PieceBytesDownloaded, {segment, bytes, peerId});
        });

        this.p2pManager.on("bytes-uploaded", (segment, bytes, peerId) => {
            this.emit(P2PEvents.PieceBytesUploaded, {segment, bytes, peerId});
        });

       

    }

    destroy = function(){
        this.p2pManager.destroy();

        this.p2pManager = null
        this.masterSwarmId = null
        this.segmentsStorage = null

        this.destroyed = true
    }
}

class P2Pvideo {
    
    constructor(app) {
        this.app = app;
        this.segmentsStorage = app.videotransport.internal;
        this.managers = {}
    }

    

    initlocalvideo = function(info){

        if(this.managers[info.masterSwarmId]) return 

        var manager = new P2PManager(this.segmentsStorage, info)

        this.managers[info.masterSwarmId] = manager

    }


    initlocalsvideo = function(){
        var videos = app.platform.sdk.localshares.getAllVideos()

        _.each(videos, (v) => {
            this.initlocalvideo(v.infos)
        })
    }

    
}



window.P2Pvideo = P2Pvideo