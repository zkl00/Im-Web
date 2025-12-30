<template>
  <div>
    <el-dialog v-dialogDrag top="5vh" custom-class="rtc-private-video-dialog" :title="title" :width="width"
      :visible.sync="showRoom" :close-on-click-modal="false" :close-on-press-escape="false" :before-close="onQuit">
      <div class="rtc-private-video">
        <div v-show="isVideo" class="rtc-video-box">
          <div class="rtc-video-friend" v-loading="!isChating" element-loading-text="等待对方接听..."
            element-loading-background="rgba(0, 0, 0, 0.1)">
            <head-image class="friend-head-image" :id="friend.id" :size="80" :name="friend.nickName"
              :url="friend.headImage" :isShowUserInfo="false" radius="0">
            </head-image>
            <video ref="remoteVideo" autoplay=""></video>
          </div>
          <div class="rtc-video-mine">
            <video ref="localVideo" autoplay=""></video>
          </div>
        </div>
        <div v-show="!isVideo" class="rtc-voice-box" v-loading="!isChating" element-loading-text="等待对方接听..."
          element-loading-background="rgba(0, 0, 0, 0.1)">
          <head-image class="friend-head-image" :id="friend.id" :size="200" :name="friend.nickName"
            :url="friend.headImage" :isShowUserInfo="false">
            <div class="rtc-voice-name">{{ friend.nickName }}</div>
          </head-image>
        </div>
        <div class="rtc-control-bar">
          <div title="取消" class="icon iconfont icon-phone-reject reject" style="color: red;" @click="onQuit()"></div>
        </div>
      </div>
    </el-dialog>
    <rtc-private-acceptor v-if="!isHost && isWaiting" ref="acceptor" :friend="friend" :mode="mode" @accept="onAccept"
      @reject="onReject"></rtc-private-acceptor>
  </div>
</template>

<script>
import HeadImage from '../common/HeadImage.vue';
import RtcPrivateAcceptor from './RtcPrivateAcceptor.vue';
import ImWebRtc from '@/api/webrtc';
import ImCamera from '@/api/camera';
import RtcPrivateApi from '@/api/rtcPrivateApi'

export default {
  name: 'rtcPrivateVideo',
  components: {
    HeadImage,
    RtcPrivateAcceptor
  },
  data() {
    return {
      camera: new ImCamera(), // 摄像头和麦克风
      webrtc: new ImWebRtc(), // webrtc相关
      API: new RtcPrivateApi(), // API
      audio: new Audio(), // 呼叫音频
      showRoom: false,
      friend: {
        id: '',
        nickName: '',
        headImage: ''
      },
      isHost: false, // 是否发起人
      state: "CLOSE", // CLOSE:关闭  WAITING:等待呼叫或接听 CHATING:聊天中  ERROR:出现异常
      mode: 'video', // 模式 video:视频聊 voice:语音聊天
      localStream: null, // 本地视频流
      remoteStream: null, // 对方视频流
      videoTime: 0,
      videoTimer: null,
      heartbeatTimer: null,
      candidates: [],
      invitation: null, // V2: 当前通话邀请信息
    }
  },
  methods: {
    open(rtcInfo) {
      this.mode = rtcInfo.mode;
      this.isHost = rtcInfo.isHost;
      // 防御性检查：确保 friend 对象有效
      if (rtcInfo.friend) {
        this.friend = rtcInfo.friend;
      } else {
        this.$message.error('无法获取好友信息');
        return;
      }
      this.showRoom = true;
      if (this.isHost) {
        this.onCall();
      }
    },
    initAudio() {
      let url = require(`@/assets/audio/call.wav`);
      this.audio.src = url;
      this.audio.loop = true;
    },
    initRtc() {
      this.webrtc.init(this.configuration)
      this.webrtc.setupPeerConnection((stream) => {
        this.$refs.remoteVideo.srcObject = stream;
        this.remoteStream = stream;
      })
      // 监听候选信息
      this.webrtc.onIcecandidate((candidate) => {
        if (this.state == "CHATING") {
          // 连接已就绪,直接发送
          this.API.sendCandidate(this.friend.id, candidate);
        } else {
          // 连接未就绪,缓存起来，连接后再发送
          this.candidates.push(candidate)
        }
      })
      // 监听连接状态变化
      this.webrtc.onStateChange((state) => {
        console.log('[RTC] WebRTC 状态变化:', state);
        if (state == "connected") {
          console.log("[RTC] WebRTC 连接成功");
        } else if (state == "disconnected" || state == "failed") {
          console.log("[RTC] WebRTC 连接断开或失败");
          // 如果正在通话中，对方可能已挂断
          if (this.isChating) {
            this.$message.info('通话已结束');
            this.close();
          }
        }
      })
    },
    onCall() {
      if (!this.checkDevEnable()) {
        this.close();
        return;
      }
      // 初始化webrtc
      this.initRtc();
      // 启动心跳 (V2 使用 WebSocket 心跳，此处保留兼容)
      this.startHeartBeat();
      // 打开摄像头
      this.openStream().then(() => {
        this.webrtc.setStream(this.localStream);
        // V2: 先发起呼叫信令，等对方接听后再创建 Offer
        this.API.call(this.friend.id, this.mode).then((result) => {
          console.log('[RTC] 主叫方: 呼叫信令发送成功', result);
          // 保存邀请信息
          this.invitation = result.invitation;
          // 更新 roomID
          if (result.response && result.response.data && result.response.data.roomID) {
            this.invitation.roomID = result.response.data.roomID;
            console.log('[RTC] 主叫方: roomID 更新为', this.invitation.roomID);
          }
          // 进入等待状态
          this.state = "WAITING";
          console.log('[RTC] 主叫方: 进入 WAITING 状态');
          // 播放呼叫铃声
          this.audio.play().catch(e => console.warn('[RTC] 主叫方: 铃声播放失败', e));
        }).catch((e) => {
          console.error('[RTC] 发起呼叫失败:', e);
          this.$message.error('发起呼叫失败');
          this.close();
        })
      }).catch(() => {
        // 呼叫方必须能打开摄像头，否则无法正常建立连接
        this.close();
      })
    },
    async onAccept() {
      if (!this.checkDevEnable()) {
        this.API.failed(this.friend.id, "对方设备不支持通话")
        this.close();
        return;
      }
      // 进入房间
      this.showRoom = true;
      this.state = "CHATING";
      // 停止呼叫铃声
      this.audio.pause();
      // 初始化webrtc
      this.initRtc();
      // 打开摄像头
      await this.openStream().catch(() => {});
      this.webrtc.setStream(this.localStream);

      try {
        // V2: 发送接受信令
        await this.API.accept(this.friend.id);
        console.log('[RTC] 已发送接听信令');

        // 清理定时器
        this.waitTimer && clearTimeout(this.waitTimer);

        // 被叫方创建 Offer 并发送给主叫方
        // (服务端不推送 accept 通知，主叫方通过收到 Offer 知道对方已接听)
        console.log('[RTC] 被叫方创建 Offer...');
        const offer = await this.webrtc.createOffer();
        await this.API.sendOffer(this.friend.id, offer);
        console.log('[RTC] Offer 已发送给主叫方');

        // 记录时长
        this.startChatTime();
      } catch (e) {
        console.error('[RTC] 接听失败:', e);
        this.$message.error('接听失败');
        this.close();
      }
    },
    onReject() {
      // 退出通话
      this.API.reject(this.friend.id);
      // 退出
      this.close('rejected');
    },
    onHandup() {
      this.API.handup(this.friend.id)
      this.$message.success("您已挂断,通话结束")
      this.close('completed');
    },
    onCancel() {
      this.API.cancel(this.friend.id)
      this.$message.success("已取消呼叫,通话结束")
      this.close('cancelled');
    },
    // V2: 处理 WebSocket RTC 信令回调
    onRTCMessageV2(data) {
      console.log('[RTC] 收到V2信令:', data);

      if (data.type === 'signal') {
        // RTC 信令通知 (来电/接听/拒绝等)
        this.handleSignalNotification(data);
      } else if (data.type === 'webrtc') {
        // WebRTC 信令 (Offer/Answer/Candidate)
        this.handleWebRTCSignal(data);
      }
    },

    // 处理 RTC 信令通知
    handleSignalNotification(data) {
      const invitation = data.invitation;
      const signalType = data.signalType || 'invite';

      console.log('[RTC] 处理信令通知, type:', signalType, 'invitation:', invitation);

      if (!invitation) return;

      const myId = this.userStore.userInfo.id;
      const isInviter = invitation.inviterUserID === myId;

      console.log('[RTC] 当前状态:', this.state, 'myId:', myId, 'inviterUserID:', invitation.inviterUserID);
      console.log('[RTC] isInviter:', isInviter, 'isWaiting:', this.isWaiting, 'isClose:', this.isClose);

      // 根据信令类型处理
      switch (signalType) {
        case 'invite':
          // 收到来电邀请（仅被叫方处理）
          console.log('[RTC] invite 条件检查: isInviter=', isInviter, 'isClose=', this.isClose, 'isHost=', this.isHost);

          // 如果是主叫方收到自己发的 invite 推送，忽略
          if (isInviter) {
            console.log('[RTC] 主叫方收到自己的 invite 推送，忽略');
            return;
          }

          // 如果已经在通话中或等待中，忽略新的来电
          if (!this.isClose) {
            console.log('[RTC] 当前不在关闭状态，忽略新的来电');
            return;
          }

          this.onRTCCallV2(data);
          break;

        case 'accept':
          // 对方接听了（主叫方收到）
          // 注意：服务端可能不推送 accept 通知，主叫方通过收到 Offer 来知道对方已接听
          console.log('[RTC] 收到 accept 信令（备用通道）');
          if (isInviter && this.isWaiting) {
            console.log('[RTC] 主叫方收到 accept，等待 Offer...');
            // 不需要主动创建 Offer，被叫方会发送 Offer 过来
          }
          break;

        case 'reject':
          // 对方拒绝了
          if (isInviter) {
            this.$message.error('对方拒绝了您的通话请求');
            this.close('rejected');
          }
          break;

        case 'cancel':
          // 对方取消了
          if (!isInviter) {
            this.$message.success('对方取消了呼叫');
            this.close('cancelled');
          }
          break;

        case 'hungUp':
          // 对方挂断了
          this.$message.success('对方已挂断');
          this.close('completed');
          break;

        default:
          console.log('[RTC] 未知信令类型:', signalType);
      }
    },

    // 处理 WebRTC 信令
    async handleWebRTCSignal(data) {
      const { signalType, roomID } = data;

      // 检查 roomID 是否匹配
      if (this.invitation && this.invitation.roomID !== roomID) {
        console.log('[RTC] roomID 不匹配，忽略信令', 'expected:', this.invitation?.roomID, 'got:', roomID);
        return;
      }

      try {
        switch (signalType) {
          case 'offer': {
            // 主叫方收到 Offer (意味着被叫方已接听)
            console.log('[RTC] 收到 Offer，对方已接听');

            // 如果主叫方还在等待状态，需要进入通话状态
            if (this.isHost && this.isWaiting) {
              console.log('[RTC] 主叫方进入通话状态');
              this.state = 'CHATING';
              this.audio.pause();
              this.startChatTime();
            }

            // 设置远端描述并创建 Answer
            await this.webrtc.setRemoteDescription(data.data);
            const answer = await this.webrtc.createAnswer();
            await this.API.sendAnswer(this.friend.id, answer);
            console.log('[RTC] Answer 已发送');

            // 发送缓存的 candidate
            this.candidates.forEach((candidate) => {
              this.API.sendCandidate(this.friend.id, candidate);
            });
            this.candidates = [];
            break;
          }
          case 'answer': {
            // 被叫方收到 Answer
            console.log('[RTC] 收到 Answer');
            await this.webrtc.setRemoteDescription(data.data);
            // 发送缓存的 candidate
            this.candidates.forEach((candidate) => {
              this.API.sendCandidate(this.friend.id, candidate);
            });
            this.candidates = [];
            break;
          }
          case 'candidate': {
            // 收到 ICE 候选
            console.log('[RTC] 收到 ICE Candidate');
            await this.webrtc.addIceCandidate(data.data);
            break;
          }
        }
      } catch (e) {
        console.error('[RTC] 处理 WebRTC 信令失败:', e);
      }
    },

    // V2: 收到来电邀请
    onRTCCallV2(data) {
      const invitation = data.invitation;
      this.invitation = invitation;
      this.API.setInvitation(invitation);

      this.isHost = false;
      // mediaType 可能是 'audio' 或 'voice'，都表示语音通话
      this.mode = (invitation.mediaType === 'audio' || invitation.mediaType === 'voice') ? 'voice' : 'video';
      console.log('[RTC] 来电类型:', invitation.mediaType, '-> mode:', this.mode);

      // 获取好友信息 - 优先从 friendStore 获取
      const inviterID = invitation.inviterUserID;
      let friend = this.friendStore.findFriend(inviterID);

      if (friend) {
        console.log('[RTC] 从 friendStore 获取好友信息:', friend);
        this.friend = friend;
        this.startIncomingCall();
      } else {
        // friendStore 没有，尝试从 participant 获取信息
        console.log('[RTC] friendStore 未找到好友，使用 participant 信息');
        const participant = data.participant;
        const userInfo = participant?.userInfo || {};

        this.friend = {
          id: inviterID,
          nickName: userInfo.nickname || userInfo.nickName || inviterID,
          headImage: userInfo.faceURL || userInfo.headImage || ''
        };
        this.startIncomingCall();
      }
    },

    // 开始来电等待流程
    startIncomingCall() {
      this.state = "WAITING";
      this.audio.play();
      this.startHeartBeat();
      // 30s未接听自动挂掉
      this.waitTimer = setTimeout(() => {
        this.API.failed(this.friend.id, "对方无应答");
        this.$message.error("您未接听");
        this.close('missed');
      }, 30000);
    },

    // V2: 对方接听后，主叫方创建并发送 Offer
    async onRTCAcceptedV2() {
      console.log('[RTC] 对方已接听，创建 Offer');
      this.state = 'CHATING';
      this.audio.pause();

      try {
        const offer = await this.webrtc.createOffer();
        await this.API.sendOffer(this.friend.id, offer);
        // 开始计时
        this.startChatTime();
      } catch (e) {
        console.error('[RTC] 创建 Offer 失败:', e);
        this.$message.error('建立连接失败');
        this.close();
      }
    },

    // 兼容旧版：处理旧格式的 RTC 消息
    onRTCMessage(msg) {
      // 除了发起通话，如果在关闭状态就无需处理
      if (msg.type != this.$enums.MESSAGE_TYPE.RTC_CALL_VOICE &&
        msg.type != this.$enums.MESSAGE_TYPE.RTC_CALL_VIDEO &&
        this.isClose) {
        return;
      }
      // RTC信令处理
      switch (msg.type) {
        case this.$enums.MESSAGE_TYPE.RTC_CALL_VOICE:
          this.onRTCCall(msg, 'voice')
          break;
        case this.$enums.MESSAGE_TYPE.RTC_CALL_VIDEO:
          this.onRTCCall(msg, 'video')
          break;
        case this.$enums.MESSAGE_TYPE.RTC_ACCEPT:
          this.onRTCAccept(msg)
          break;
        case this.$enums.MESSAGE_TYPE.RTC_REJECT:
          this.onRTCReject(msg)
          break;
        case this.$enums.MESSAGE_TYPE.RTC_CANCEL:
          this.onRTCCancel(msg)
          break;
        case this.$enums.MESSAGE_TYPE.RTC_FAILED:
          this.onRTCFailed(msg)
          break;
        case this.$enums.MESSAGE_TYPE.RTC_HANDUP:
          this.onRTCHandup(msg)
          break;
        case this.$enums.MESSAGE_TYPE.RTC_CANDIDATE:
          this.onRTCCandidate(msg)
          break;
      }
    },
    onRTCCall(msg, mode) {
      this.offer = JSON.parse(msg.content);
      this.isHost = false;
      this.mode = mode;
      this.$http({
        url: `/friend/find/${msg.sendId}`,
        method: 'get'
      }).then((friend) => {
        this.friend = friend;
        this.state = "WAITING";
        this.audio.play();
        this.startHeartBeat();
        // 30s未接听自动挂掉
        this.waitTimer = setTimeout(() => {
          this.API.failed(this.friend.id, "对方无应答");
          this.$message.error("您未接听");
          this.close('missed');
        }, 30000)
      })
    },
    onRTCAccept(msg) {
      if (msg.selfSend) {
        // 在其他设备接听，不插入通话记录（由其他设备处理）
        this.$message.success("已在其他设备接听");
        this.state = 'CLOSE'; // 直接设置状态避免插入记录
        this.close();
      } else {
        // 对方接受了的通话
        let offer = JSON.parse(msg.content);
        this.webrtc.setRemoteDescription(offer);
        // 状态为聊天中
        this.state = 'CHATING'
        // 停止播放语音
        this.audio.pause();
        // 发送candidate
        this.candidates.forEach((candidate) => {
          this.API.sendCandidate(this.friend.id, candidate);
        })
        // 开始计时
        this.startChatTime()
      }
    },
    onRTCReject(msg) {
      if (msg.selfSend) {
        // 在其他设备拒绝，不插入通话记录
        this.$message.success("已在其他设备拒绝");
        this.state = 'CLOSE';
        this.close();
      } else {
        this.$message.error("对方拒绝了您的通话请求");
        this.close('rejected');
      }
    },
    onRTCFailed(msg) {
      // 呼叫失败
      this.$message.error(msg.content)
      this.close('missed');
    },
    onRTCCancel() {
      // 对方取消通话
      this.$message.success("对方取消了呼叫");
      this.close('cancelled');
    },
    onRTCHandup() {
      // 对方挂断
      this.$message.success("对方已挂断");
      this.close('completed');
    },
    onRTCCandidate(msg) {
      let candidate = JSON.parse(msg.content);
      this.webrtc.addIceCandidate(candidate);
    },

    openStream() {
      return new Promise((resolve, reject) => {
        if (this.isVideo) {
          // 打开摄像头+麦克风
          this.camera.openVideo().then((stream) => {
            this.localStream = stream;
            this.$nextTick(() => {
              this.$refs.localVideo.srcObject = stream;
              this.$refs.localVideo.muted = true;
            })
            resolve(stream);
          }).catch((e) => {
            this.$message.error("打开摄像头失败")
            console.log("本摄像头打开失败:" + e.message)
            reject(e);
          })
        } else {
          // 打开麦克风
          this.camera.openAudio().then((stream) => {
            this.localStream = stream;
            this.$refs.localVideo.srcObject = stream;
            this.$refs.localVideo.muted = true;
            resolve(stream);
          }).catch((e) => {
            this.$message.error("打开麦克风失败")
            console.log("打开麦克风失败:" + e.message)
            reject(e);
          })
        }
      })
    },
    startChatTime() {
      this.videoTime = 0;
      this.videoTimer && clearInterval(this.videoTimer);
      this.videoTimer = setInterval(() => {
        this.videoTime++;
      }, 1000)
    },
    checkDevEnable() {
      // 检测摄像头
      if (!this.camera.isEnable()) {
        this.message.error("访问摄像头失败");
        return false;
      }
      // 检测webrtc
      if (!this.webrtc.isEnable()) {
        this.message.error("初始化RTC失败，原因可能是: 1.服务器缺少ssl证书 2.您的设备不支持WebRTC");
        return false;
      }
      return true;
    },
    startHeartBeat() {
      // 每15s推送一次心跳
      this.heartbeatTimer && clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        this.API.heartbeat(this.friend.id);
      }, 15000)
    },
    /**
     * 插入通话记录消息到聊天
     * @param {string} reason - 结束原因: 'completed'(正常结束), 'cancelled'(取消), 'rejected'(拒绝), 'missed'(未接听)
     */
    insertCallRecord(reason) {
      if (!this.friend || !this.friend.id) return;

      const friendId = this.friend.id;
      const isVideo = this.mode === 'video';
      const duration = this.videoTime;

      // 构建消息内容
      let content = '';
      if (reason === 'completed' && duration > 0) {
        const min = Math.floor(duration / 60);
        const sec = duration % 60;
        const timeStr = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
        content = `通话时长 ${timeStr}`;
      } else if (reason === 'cancelled') {
        content = this.isHost ? '已取消' : '对方已取消';
      } else if (reason === 'rejected') {
        content = this.isHost ? '对方已拒绝' : '已拒绝';
      } else if (reason === 'missed') {
        content = this.isHost ? '对方未接听' : '未接听';
      } else {
        content = '通话已结束';
      }

      // 消息对象
      const msgInfo = {
        id: Date.now(), // 使用时间戳作为本地消息ID
        type: isVideo ? this.$enums.MESSAGE_TYPE.ACT_RT_VIDEO : this.$enums.MESSAGE_TYPE.ACT_RT_VOICE,
        content: content,
        sendTime: new Date().getTime(),
        sendId: this.userStore.userInfo.id,
        selfSend: this.isHost,
        status: 2 // 已送达
      };

      // 聊天信息
      const chatInfo = {
        type: 'PRIVATE',
        targetId: friendId
      };

      // 插入消息
      this.chatStore.insertMessage(msgInfo, chatInfo);
      console.log('[RTC] 已插入通话记录:', content, 'friend:', friendId);
    },
    close(reason = 'completed') {
      console.log('[RTC] close() 被调用，当前状态:', this.state, '原因:', reason);

      // 在清理状态之前插入通话记录
      if (this.state !== 'CLOSE' && this.friend && this.friend.id) {
        this.insertCallRecord(reason);
      }

      this.showRoom = false;
      this.camera.close();
      this.webrtc.close();
      this.audio.pause();
      this.videoTime = 0;
      this.videoTimer && clearInterval(this.videoTimer);
      this.heartbeatTimer && clearInterval(this.heartbeatTimer);
      this.waitTimer && clearTimeout(this.waitTimer);
      this.videoTimer = null;
      this.heartbeatTimer = null;
      this.waitTimer = null;
      this.state = 'CLOSE';
      this.candidates = [];
      this.invitation = null;
      this.friend = { id: '', nickName: '', headImage: '' };
      this.API.cleanup();
    },
    onQuit() {
      if (this.isChating) {
        this.onHandup()
      } else if (this.isWaiting) {
        this.onCancel();
      } else {
        this.close();
      }
    }
  },
  computed: {
    width() {
      return this.isVideo ? '960px' : '360px'
    },
    title() {
      let strTitle = `${this.modeText}通话-${this.friend.nickName}`;
      if (this.isChating) {
        strTitle += `(${this.currentTime})`;
      } else if (this.isWaiting) {
        strTitle += `(呼叫中)`;
      }
      return strTitle;
    },
    currentTime() {
      let min = Math.floor(this.videoTime / 60);
      let sec = this.videoTime % 60;
      let strTime = min < 10 ? "0" : "";
      strTime += min;
      strTime += ":"
      strTime += sec < 10 ? "0" : "";
      strTime += sec;
      return strTime;
    },
    configuration() {
      const iceServers = this.configStore.webrtc.iceServers;
      return {
        iceServers: iceServers
      }
    },
    isVideo() {
      return this.mode == "video"
    },
    modeText() {
      return this.isVideo ? "视频" : "语音";
    },
    isChating() {
      return this.state == "CHATING";
    },
    isWaiting() {
      return this.state == "WAITING";
    },
    isClose() {
      return this.state == "CLOSE";
    }
  },
  mounted() {
    // 初始化音频文件
    this.initAudio();
  },
  created() {
    // 监听页面刷新事件
    window.addEventListener('beforeunload', () => {
      this.onQuit();
    });
  },
  beforeUnmount() {
    this.onQuit();
  }
}
</script>

<style lang="scss" scoped>
.rtc-private-video {
  position: relative;

  .el-loading-text {
    color: white !important;
    font-size: 16px !important;
  }

  .path {
    stroke: white !important;
  }

  .rtc-video-box {
    position: relative;
    background-color: #eeeeee;

    .rtc-video-friend {
      height: 70vh;

      .friend-head-image {
        position: absolute;
      }

      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: rotateY(180deg);
      }
    }

    .rtc-video-mine {
      position: absolute;
      z-index: 99999;
      width: 25vh;
      right: 0;
      bottom: -1px;

      video {
        width: 100%;
        object-fit: cover;
        transform: rotateY(180deg);
      }
    }
  }

  .rtc-voice-box {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 300px;
    background-color: var(--im-color-primary-light-9);

    .rtc-voice-name {
      text-align: center;
      font-size: 20px;
      font-weight: 600;
    }
  }

  .rtc-control-bar {
    display: flex;
    justify-content: space-around;
    padding: 10px;

    .icon {
      font-size: 50px;
      cursor: pointer;
    }
  }
}
</style>
