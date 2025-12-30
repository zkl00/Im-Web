/**
 * RTC 私聊音视频 API (V2 WebSocket 信令版本)
 *
 * 使用 WebSocket 发送 RTC 信令，替代原有的 HTTP 接口
 */
import * as wsApi from './wssocket.js'

class RtcPrivateApi {
  constructor() {
    // 当前通话状态
    this.currentInvitation = null
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.roomID = null
  }

  /**
   * 发起通话
   * @param {string} uid 被叫方用户ID
   * @param {string} mode 通话模式: 'video' 或 'audio'
   * @param {RTCSessionDescriptionInit} offer WebRTC Offer (可选，新版本在接听后再创建)
   * @returns {Promise<{invitation: Object, response: Object}>}
   */
  call(uid, mode, offer) {
    return wsApi.rtcInvite(uid, mode).then(result => {
      this.currentInvitation = result.invitation
      // 更新为服务端分配的 roomID
      if (result.response && result.response.data && result.response.data.roomID) {
        this.currentInvitation.roomID = result.response.data.roomID
        this.roomID = result.response.data.roomID
      }
      return result
    })
  }

  /**
   * 接听通话
   * @param {string} uid 主叫方用户ID (兼容旧接口)
   * @param {RTCSessionDescriptionInit} answer WebRTC Answer (可选，新版本单独发送)
   * @returns {Promise}
   */
  accept(uid, answer) {
    if (!this.currentInvitation) {
      return Promise.reject(new Error('没有待接听的通话'))
    }
    return wsApi.rtcAccept(this.currentInvitation)
  }

  /**
   * 挂断通话
   * @param {string} uid 对方用户ID
   * @returns {Promise}
   */
  handup(uid) {
    if (!this.currentInvitation) {
      return Promise.resolve()
    }
    return wsApi.rtcHungUp(this.currentInvitation).finally(() => {
      this.cleanup()
    })
  }

  /**
   * 取消呼叫 (在对方接听前)
   * @param {string} uid 被叫方用户ID
   * @returns {Promise}
   */
  cancel(uid) {
    if (!this.currentInvitation) {
      return Promise.resolve()
    }
    return wsApi.rtcCancel(this.currentInvitation).finally(() => {
      this.cleanup()
    })
  }

  /**
   * 拒绝来电
   * @param {string} uid 主叫方用户ID
   * @returns {Promise}
   */
  reject(uid) {
    if (!this.currentInvitation) {
      return Promise.resolve()
    }
    return wsApi.rtcReject(this.currentInvitation).finally(() => {
      this.cleanup()
    })
  }

  /**
   * 通话失败
   * @param {string} uid 对方用户ID
   * @param {string} reason 失败原因
   * @returns {Promise}
   */
  failed(uid, reason) {
    // V2 中通过挂断信令处理失败情况
    return this.handup(uid)
  }

  /**
   * 发送 ICE Candidate
   * @param {string} uid 对方用户ID
   * @param {RTCIceCandidate} candidate ICE 候选
   * @returns {Promise}
   */
  sendCandidate(uid, candidate) {
    if (!this.roomID) {
      return Promise.reject(new Error('roomID 未设置'))
    }
    return wsApi.sendWebRTCSignal(uid, 'candidate', candidate, this.roomID)
  }

  /**
   * 发送 WebRTC Offer
   * @param {string} uid 对方用户ID
   * @param {RTCSessionDescriptionInit} offer
   * @returns {Promise}
   */
  sendOffer(uid, offer) {
    if (!this.roomID) {
      return Promise.reject(new Error('roomID 未设置'))
    }
    return wsApi.sendWebRTCSignal(uid, 'offer', offer, this.roomID)
  }

  /**
   * 发送 WebRTC Answer
   * @param {string} uid 对方用户ID
   * @param {RTCSessionDescriptionInit} answer
   * @returns {Promise}
   */
  sendAnswer(uid, answer) {
    if (!this.roomID) {
      return Promise.reject(new Error('roomID 未设置'))
    }
    return wsApi.sendWebRTCSignal(uid, 'answer', answer, this.roomID)
  }

  /**
   * 心跳 (V2 中不需要单独发送，WebSocket 连接自带心跳)
   * @param {string} uid 对方用户ID
   * @returns {Promise}
   */
  heartbeat(uid) {
    // WebSocket 连接自带心跳，此方法保留兼容性
    return Promise.resolve()
  }

  /**
   * 设置来电邀请 (被叫方收到来电时调用)
   * @param {Object} invitation 邀请信息
   */
  setInvitation(invitation) {
    this.currentInvitation = invitation
    this.roomID = invitation.roomID
  }

  /**
   * 获取当前邀请信息
   * @returns {Object|null}
   */
  getInvitation() {
    return this.currentInvitation
  }

  /**
   * 设置 roomID
   * @param {string} roomID
   */
  setRoomID(roomID) {
    this.roomID = roomID
    if (this.currentInvitation) {
      this.currentInvitation.roomID = roomID
    }
  }

  /**
   * 清理通话状态
   */
  cleanup() {
    this.currentInvitation = null
    this.roomID = null

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    this.remoteStream = null
  }
}

export default RtcPrivateApi
