<template>
	<el-container class="apply-page">
		<resizable-aside :default-width="260" :min-width="200" :max-width="500" storage-key="apply-aside-width">
			<div class="header">
				<span class="title">好友申请</span>
			</div>
			<div class="tab-header">
				<div class="tab-item" :class="{ active: activeTab === 'received' }" @click="switchTab('received')">
					收到的申请
					<span v-if="receivedTotal > 0" class="badge">{{ receivedTotal }}</span>
				</div>
				<div class="tab-item" :class="{ active: activeTab === 'sent' }" @click="switchTab('sent')">
					我发起的
				</div>
			</div>
			<el-scrollbar ref="scrollbar" class="apply-items" @scroll="onScroll">
				<!-- 收到的申请 -->
				<template v-if="activeTab === 'received'">
					<div v-if="receivedList.length === 0 && !receivedLoading" class="empty-tip">暂无好友申请</div>
					<div v-for="item in receivedList" :key="item.fromUserID" class="apply-item"
						:class="{ active: activeApply && activeApply.fromUserID === item.fromUserID }"
						@click="onSelectApply(item)">
						<head-image :size="40" :name="item.fromNickname" :url="item.fromFaceURL"></head-image>
						<div class="apply-info">
							<div class="nickname">{{ item.fromNickname }}</div>
							<div class="message">{{ item.reqMsg || '请求添加您为好友' }}</div>
						</div>
						<div class="status">
							<span v-if="item.handleResult === 0" class="pending">待处理</span>
							<span v-else-if="item.handleResult === 1" class="accepted">已同意</span>
							<span v-else-if="item.handleResult === -1" class="rejected">已拒绝</span>
						</div>
					</div>
					<div v-if="receivedLoading" class="loading-tip">
						<i class="el-icon-loading"></i> 加载中...
					</div>
					<div v-if="!receivedHasMore && receivedList.length > 0" class="no-more-tip">没有更多了</div>
				</template>
				<!-- 我发起的申请 -->
				<template v-else>
					<div v-if="sentList.length === 0 && !sentLoading" class="empty-tip">暂无发起的申请</div>
					<div v-for="item in sentList" :key="item.toUserID" class="apply-item"
						:class="{ active: activeApply && activeApply.toUserID === item.toUserID }"
						@click="onSelectApply(item)">
						<head-image :size="40" :name="item.toNickname" :url="item.toFaceURL"></head-image>
						<div class="apply-info">
							<div class="nickname">{{ item.toNickname }}</div>
							<div class="message">{{ item.reqMsg || '等待对方验证' }}</div>
						</div>
						<div class="status">
							<span v-if="item.handleResult === 0" class="pending">等待验证</span>
							<span v-else-if="item.handleResult === 1" class="accepted">已通过</span>
							<span v-else-if="item.handleResult === -1" class="rejected">已拒绝</span>
						</div>
					</div>
					<div v-if="sentLoading" class="loading-tip">
						<i class="el-icon-loading"></i> 加载中...
					</div>
					<div v-if="!sentHasMore && sentList.length > 0" class="no-more-tip">没有更多了</div>
				</template>
			</el-scrollbar>
		</resizable-aside>
		<el-container class="container">
			<template v-if="activeApply">
				<div class="header">
					{{ activeTab === 'received' ? activeApply.fromNickname : activeApply.toNickname }}
				</div>
				<div class="apply-detail">
					<head-image :size="120"
						:name="activeTab === 'received' ? activeApply.fromNickname : activeApply.toNickname"
						:url="activeTab === 'received' ? activeApply.fromFaceURL : activeApply.toFaceURL"
						radius="10%">
					</head-image>
					<div class="detail-info">
						<el-descriptions title="申请信息" class="description" :column="1">
							<el-descriptions-item label="用户ID">
								{{ activeTab === 'received' ? activeApply.fromUserID : activeApply.toUserID }}
							</el-descriptions-item>
							<el-descriptions-item label="昵称">
								{{ activeTab === 'received' ? activeApply.fromNickname : activeApply.toNickname }}
							</el-descriptions-item>
							<el-descriptions-item label="验证信息">
								{{ activeApply.reqMsg || '无' }}
							</el-descriptions-item>
							<el-descriptions-item label="申请时间">
								{{ formatTime(activeApply.createTime) }}
							</el-descriptions-item>
							<el-descriptions-item label="状态">
								<span v-if="activeApply.handleResult === 0" class="status-pending">待处理</span>
								<span v-else-if="activeApply.handleResult === 1" class="status-accepted">已同意</span>
								<span v-else-if="activeApply.handleResult === -1" class="status-rejected">已拒绝</span>
							</el-descriptions-item>
						</el-descriptions>
						<div class="btn-group" v-if="activeTab === 'received' && activeApply.handleResult === 0">
							<el-button type="primary" icon="el-icon-check" @click="onAccept">同意</el-button>
							<el-button type="danger" icon="el-icon-close" @click="onReject">拒绝</el-button>
						</div>
					</div>
				</div>
			</template>
			<template v-else>
				<div class="empty-detail">
					<i class="el-icon-user"></i>
					<p>请选择一个申请查看详情</p>
				</div>
			</template>
		</el-container>
	</el-container>
</template>

<script>
import HeadImage from "../components/common/HeadImage.vue";
import ResizableAside from "../components/common/ResizableAside.vue";

const PAGE_SIZE = 20;

export default {
	name: "FriendApply",
	components: {
		HeadImage,
		ResizableAside
	},
	data() {
		return {
			activeTab: 'received',
			// 收到的申请
			receivedList: [],
			receivedPage: 1,
			receivedTotal: 0,
			receivedHasMore: true,
			receivedLoading: false,
			// 我发起的申请
			sentList: [],
			sentPage: 1,
			sentTotal: 0,
			sentHasMore: true,
			sentLoading: false,
			// 当前选中
			activeApply: null
		}
	},
	mounted() {
		this.loadReceivedApplyList();
		this.loadSentApplyList();
		// 绑定滚动事件
		this.$nextTick(() => {
			const scrollbarWrap = this.$refs.scrollbar?.$refs?.wrap;
			if (scrollbarWrap) {
				scrollbarWrap.addEventListener('scroll', this.onScroll);
			}
		});
	},
	beforeDestroy() {
		const scrollbarWrap = this.$refs.scrollbar?.$refs?.wrap;
		if (scrollbarWrap) {
			scrollbarWrap.removeEventListener('scroll', this.onScroll);
		}
	},
	methods: {
		switchTab(tab) {
			this.activeTab = tab;
			this.activeApply = null;
		},
		onSelectApply(item) {
			this.activeApply = item;
		},
		formatTime(timestamp) {
			if (!timestamp) return '';
			const date = new Date(timestamp);
			return date.toLocaleString();
		},
		onScroll(e) {
			const { scrollTop, scrollHeight, clientHeight } = e.target;
			// 距离底部 50px 时触发加载
			if (scrollHeight - scrollTop - clientHeight < 50) {
				this.loadMore();
			}
		},
		loadMore() {
			if (this.activeTab === 'received') {
				if (!this.receivedLoading && this.receivedHasMore) {
					this.loadReceivedApplyList(true);
				}
			} else {
				if (!this.sentLoading && this.sentHasMore) {
					this.loadSentApplyList(true);
				}
			}
		},
		// 加载收到的好友申请
		loadReceivedApplyList(loadMore = false) {
			const userID = sessionStorage.getItem("userID");
			if (!userID) return;
			if (this.receivedLoading) return;

			if (loadMore) {
				this.receivedPage++;
			} else {
				this.receivedPage = 1;
				this.receivedList = [];
				this.receivedHasMore = true;
			}

			this.receivedLoading = true;
			this.$http({
				url: '/friend/get_friend_apply_list',
				method: 'POST',
				data: {
					userID: userID,
					pagination: {
						pageNumber: this.receivedPage,
						showNumber: PAGE_SIZE
					}
				}
			}).then((data) => {
				const list = data.FriendRequests || data.friendRequests || [];
				const pendingCount = list.filter(item => item.handleResult === 0).length;
				if (loadMore) {
					this.receivedList = [...this.receivedList, ...list];
					this.receivedTotal += pendingCount;  // 累加未处理数量
				} else {
					this.receivedList = list;
					this.receivedTotal = pendingCount;  // 重置未处理数量
				}
				// 判断是否还有更多
				this.receivedHasMore = list.length >= PAGE_SIZE;
			}).catch((e) => {
				console.error('加载好友申请列表失败', e);
				if (loadMore) {
					this.receivedPage--;
				}
			}).finally(() => {
				this.receivedLoading = false;
			});
		},
		// 加载我发起的好友申请
		loadSentApplyList(loadMore = false) {
			const userID = sessionStorage.getItem("userID");
			if (!userID) return;
			if (this.sentLoading) return;

			if (loadMore) {
				this.sentPage++;
			} else {
				this.sentPage = 1;
				this.sentList = [];
				this.sentHasMore = true;
			}

			this.sentLoading = true;
			this.$http({
				url: '/friend/get_self_friend_apply_list',
				method: 'POST',
				data: {
					userID: userID,
					pagination: {
						pageNumber: this.sentPage,
						showNumber: PAGE_SIZE
					}
				}
			}).then((data) => {
				const list = data.friendRequests || data.FriendRequests || [];
				this.sentTotal = data.total || 0;
				if (loadMore) {
					this.sentList = [...this.sentList, ...list];
				} else {
					this.sentList = list;
				}
				// 判断是否还有更多
				this.sentHasMore = list.length >= PAGE_SIZE;
			}).catch((e) => {
				console.error('加载我发起的申请列表失败', e);
				if (loadMore) {
					this.sentPage--;
				}
			}).finally(() => {
				this.sentLoading = false;
			});
		},
		// 同意好友申请
		onAccept() {
			const userID = sessionStorage.getItem("userID");
			if (!userID || !this.activeApply) return;

			this.$http({
				url: '/friend/add_friend_response',
				method: 'POST',
				data: {
					fromUserID: this.activeApply.fromUserID,
					toUserID: userID,
					handleResult: 1,
					handleMsg: '同意'
				}
			}).then(() => {
				this.$message.success('已同意好友申请');
				this.activeApply.handleResult = 1;
				// 刷新好友列表
				this.friendStore.loadFriend();
			}).catch((e) => {
				this.$message.error('操作失败');
				console.error(e);
			});
		},
		// 拒绝好友申请
		onReject() {
			const userID = sessionStorage.getItem("userID");
			if (!userID || !this.activeApply) return;

			this.$confirm('确认拒绝该好友申请?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(() => {
				this.$http({
					url: '/friend/add_friend_response',
					method: 'POST',
					data: {
						fromUserID: this.activeApply.fromUserID,
						toUserID: userID,
						handleResult: -1,
						handleMsg: '拒绝'
					}
				}).then(() => {
					this.$message.success('已拒绝好友申请');
					this.activeApply.handleResult = -1;
				}).catch((e) => {
					this.$message.error('操作失败');
					console.error(e);
				});
			}).catch(() => {});
		}
	}
}
</script>

<style lang="scss" scoped>
.apply-page {
	height: 100%;

	.header {
		height: 50px;
		display: flex;
		align-items: center;
		padding: 0 15px;
		font-size: var(--im-font-size-larger);
		border-bottom: var(--im-border);

		.title {
			font-weight: bold;
		}
	}

	.tab-header {
		display: flex;
		border-bottom: var(--im-border);

		.tab-item {
			flex: 1;
			padding: 12px 0;
			text-align: center;
			cursor: pointer;
			position: relative;
			color: var(--im-text-color-light);
			transition: all 0.3s;

			&:hover {
				color: var(--im-primary-color);
			}

			&.active {
				color: var(--im-primary-color);
				font-weight: bold;

				&::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 20%;
					width: 60%;
					height: 2px;
					background-color: var(--im-primary-color);
				}
			}

			.badge {
				background-color: #f56c6c;
				color: #fff;
				font-size: 12px;
				padding: 2px 6px;
				border-radius: 10px;
				margin-left: 5px;
			}
		}
	}

	.apply-items {
		flex: 1;

		.empty-tip {
			text-align: center;
			color: var(--im-text-color-light);
			padding: 40px 0;
		}

		.loading-tip {
			text-align: center;
			color: var(--im-text-color-light);
			padding: 15px 0;
			font-size: 13px;
		}

		.no-more-tip {
			text-align: center;
			color: var(--im-text-color-lighter);
			padding: 15px 0;
			font-size: 12px;
		}

		.apply-item {
			display: flex;
			align-items: center;
			padding: 12px 15px;
			cursor: pointer;
			transition: background-color 0.3s;

			&:hover {
				background-color: var(--im-background-light);
			}

			&.active {
				background-color: var(--im-background);
			}

			.apply-info {
				flex: 1;
				margin-left: 10px;
				overflow: hidden;

				.nickname {
					font-size: 14px;
					font-weight: 500;
					margin-bottom: 4px;
				}

				.message {
					font-size: 12px;
					color: var(--im-text-color-light);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}

			.status {
				font-size: 12px;

				.pending {
					color: #e6a23c;
				}

				.accepted {
					color: #67c23a;
				}

				.rejected {
					color: #f56c6c;
				}
			}
		}
	}
}

.container {
	display: flex;
	flex-direction: column;

	.header {
		height: 50px;
		display: flex;
		align-items: center;
		padding: 0 15px;
		font-size: var(--im-font-size-larger);
		border-bottom: var(--im-border);
	}

	.apply-detail {
		display: flex;
		padding: 50px 80px 20px 80px;

		.detail-info {
			margin-left: 30px;

			.description {
				background-color: #ffffff;
				border: 1px #ddd solid;
				padding: 20px;
			}

			.status-pending {
				color: #e6a23c;
				font-weight: bold;
			}

			.status-accepted {
				color: #67c23a;
				font-weight: bold;
			}

			.status-rejected {
				color: #f56c6c;
				font-weight: bold;
			}

			.btn-group {
				margin-top: 20px;
			}
		}
	}

	.empty-detail {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: var(--im-text-color-light);

		i {
			font-size: 60px;
			margin-bottom: 20px;
		}
	}
}
</style>
