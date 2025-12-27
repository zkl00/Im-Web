<template>
	<el-container class="blacklist-page">
		<resizable-aside :default-width="260" :min-width="200" :max-width="500" storage-key="blacklist-aside-width">
			<div class="header">
				<span class="title">黑名单</span>
			</div>
			<el-scrollbar class="black-items" ref="scrollbar">
				<div v-if="loading && blackList.length === 0" class="loading-tip">
					<i class="el-icon-loading"></i> 加载中...
				</div>
				<div v-else-if="!loading && blackList.length === 0" class="empty-tip">
					暂无黑名单用户
				</div>
				<div v-else class="list-container" ref="listContainer">
					<div v-for="item in blackList" :key="item.blackUserInfo.userID"
						class="black-item" :class="{ active: activeUser && activeUser.userID === item.blackUserInfo.userID }"
						@click="onSelectUser(item)">
						<div class="user-avatar">
							<head-image :size="42" :name="item.blackUserInfo.nickname"
								:url="item.blackUserInfo.faceURL">
							</head-image>
						</div>
						<div class="user-info">
							<div class="user-name">{{ item.blackUserInfo.nickname }}</div>
							<div class="black-time">{{ formatTime(item.createTime) }}</div>
						</div>
					</div>
					<div class="load-more-tip">
						<span v-if="loadingMore"><i class="el-icon-loading"></i> 加载中...</span>
						<span v-else-if="!hasMore">没有更多了</span>
					</div>
				</div>
			</el-scrollbar>
		</resizable-aside>
		<el-container class="container">
			<div class="header" v-show="activeUser">
				{{ activeUser ? activeUser.nickname : '' }}
			</div>
			<div v-show="activeUser" class="user-detail">
				<div class="user-info-card">
					<head-image :size="120" :name="activeUser ? activeUser.nickname : ''"
						:url="activeUser ? activeUser.faceURL : ''" radius="10%">
					</head-image>
					<div class="info-content">
						<el-descriptions title="用户信息" class="description" :column="1">
							<el-descriptions-item label="用户ID">{{ activeUser ? activeUser.userID : '' }}</el-descriptions-item>
							<el-descriptions-item label="昵称">{{ activeUser ? activeUser.nickname : '' }}</el-descriptions-item>
						</el-descriptions>
						<div class="btn-group">
							<el-button icon="el-icon-delete" type="primary" @click="onRemoveBlack()">
								移除黑名单
							</el-button>
						</div>
					</div>
				</div>
			</div>
		</el-container>
	</el-container>
</template>

<script>
import HeadImage from "../components/common/HeadImage.vue";
import ResizableAside from "../components/common/ResizableAside.vue";

export default {
	name: "BlackList",
	components: {
		HeadImage,
		ResizableAside
	},
	data() {
		return {
			loading: false,
			loadingMore: false,
			hasMore: true,
			blackList: [],
			activeUser: null,
			activeItem: null,
			pagination: {
				pageNumber: 1,
				showNumber: 20
			},
			total: 0
		}
	},
	methods: {
		loadBlackList(loadMore = false) {
			if (loadMore) {
				if (this.loadingMore || !this.hasMore) return;
				this.loadingMore = true;
			} else {
				this.loading = true;
				this.pagination.pageNumber = 1;
				this.blackList = [];
			}

			const userID = sessionStorage.getItem("userID");
			this.$http({
				url: '/friend/get_black_list',
				method: 'POST',
				data: {
					userID: userID,
					pagination: this.pagination
				}
			}).then((data) => {
				const blacks = data.blacks || [];
				this.total = data.total || 0;

				if (loadMore) {
					this.blackList = [...this.blackList, ...blacks];
					this.loadingMore = false;
				} else {
					this.blackList = blacks;
					this.loading = false;
				}

				// 判断是否还有更多
				this.hasMore = this.blackList.length < this.total;
				this.pagination.pageNumber++;
			}).catch(() => {
				if (loadMore) {
					this.loadingMore = false;
				} else {
					this.loading = false;
				}
				this.$message.error("加载黑名单失败");
			});
		},
		onScroll(e) {
			const target = e.target;
			const scrollTop = target.scrollTop;
			const scrollHeight = target.scrollHeight;
			const clientHeight = target.clientHeight;

			// 距离底部 50px 时触发加载
			if (scrollHeight - scrollTop - clientHeight < 50) {
				this.loadBlackList(true);
			}
		},
		initScrollListener() {
			this.$nextTick(() => {
				const scrollbar = this.$refs.scrollbar;
				if (scrollbar && scrollbar.$refs && scrollbar.$refs.wrap) {
					scrollbar.$refs.wrap.addEventListener('scroll', this.onScroll);
				}
			});
		},
		removeScrollListener() {
			const scrollbar = this.$refs.scrollbar;
			if (scrollbar && scrollbar.$refs && scrollbar.$refs.wrap) {
				scrollbar.$refs.wrap.removeEventListener('scroll', this.onScroll);
			}
		},
		onSelectUser(item) {
			this.activeUser = item.blackUserInfo;
			this.activeItem = item;
		},
		onRemoveBlack() {
			if (!this.activeUser) return;

			this.$confirm(`确认将 "${this.activeUser.nickname}" 移出黑名单吗?`, '确认移除', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(() => {
				const userID = sessionStorage.getItem("userID");
				this.$http({
					url: '/friend/remove_black',
					method: 'POST',
					data: {
						ownerUserID: userID,
						blackUserID: this.activeUser.userID
					}
				}).then(() => {
					this.$message.success("已移出黑名单");
					// 从列表中移除
					const index = this.blackList.findIndex(
						item => item.blackUserInfo.userID === this.activeUser.userID
					);
					if (index > -1) {
						this.blackList.splice(index, 1);
					}
					this.activeUser = null;
					this.activeItem = null;
				}).catch(() => {
					this.$message.error("移除失败");
				});
			});
		},
		formatTime(timestamp) {
			if (!timestamp) return '';
			const date = new Date(timestamp * 1000);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		}
	},
	mounted() {
		this.loadBlackList();
		this.initScrollListener();
	},
	beforeDestroy() {
		this.removeScrollListener();
	}
}
</script>

<style lang="scss" scoped>
.blacklist-page {
	.header {
		height: 50px;
		display: flex;
		align-items: center;
		padding: 0 15px;
		font-size: var(--im-font-size-larger);
		border-bottom: var(--im-border);

		.title {
			font-weight: 500;
		}
	}

	.black-items {
		flex: 1;

		.loading-tip,
		.empty-tip {
			text-align: center;
			padding: 40px 0;
			color: var(--im-text-color-light);
		}

		.load-more-tip {
			text-align: center;
			padding: 15px 0;
			color: var(--im-text-color-light);
			font-size: var(--im-font-size-smaller);
		}

		.black-item {
			height: 60px;
			display: flex;
			align-items: center;
			padding: 5px 12px;
			margin: 0 5px;
			border-radius: 8px;
			cursor: pointer;

			&:hover {
				background-color: var(--im-background-active);
			}

			&.active {
				background-color: var(--im-background-active-dark);
			}

			.user-avatar {
				display: flex;
				justify-content: center;
				align-items: center;
			}

			.user-info {
				flex: 1;
				padding-left: 10px;
				text-align: left;
				overflow: hidden;

				.user-name {
					font-size: var(--im-font-size);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}

				.black-time {
					font-size: var(--im-font-size-smaller);
					color: var(--im-text-color-light);
					margin-top: 4px;
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
		justify-content: space-between;
		align-items: center;
		padding: 0 12px;
		font-size: var(--im-font-size-larger);
		border-bottom: var(--im-border);
		box-sizing: border-box;
	}

	.user-detail {
		flex: 1;
		display: flex;
		justify-content: center;
		padding-top: 50px;

		.user-info-card {
			display: flex;
			padding: 30px;

			.info-content {
				margin-left: 30px;

				.description {
					background-color: #ffffff;
					border: 1px #ddd solid;
					padding: 20px;
				}

				.btn-group {
					margin-top: 20px;
				}
			}
		}
	}
}
</style>
