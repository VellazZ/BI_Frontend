<!-- components/NewsStats.vue -->
<template>
    <div class="news-stats">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>新闻统计查询</span>
          </div>
        </template>
  
        <!-- 查询表单 -->
        <el-form :model="queryForm" :inline="true" class="query-form">
          <el-form-item label="时间范围:">
            <el-date-picker
              v-model="queryForm.timeRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="X"
              :default-value="defaultTimeRange"
              :picker-options="pickerOptions"
            />
          </el-form-item>

          <!-- 用户ID字段提前，并添加必填标识 -->
          <el-form-item label="用户ID:" required>
            <el-input
              v-model="queryForm.userIds"
              placeholder="请输入用户ID（支持多个，逗号分隔）"
              style="width: 250px;"
              :class="{ 'input-error': showUserIdError }"
              @input="handleUserIdInput"
              @blur="validateUserId"
            />
            <el-tooltip content="至少需要输入一个有效的用户ID" placement="top">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </el-form-item>
          
          <!-- 用户ID错误提示 -->
          <div v-if="showUserIdError" class="error-message">
            请输入至少一个有效的用户ID
          </div>
  
          <el-form-item label="新闻主题:">
            <el-input
              v-model="queryForm.topics"
              placeholder="输入主题，逗号分隔（可选）"
              style="width: 200px;"
            />
          </el-form-item>
  
          <el-form-item label="标题长度:">
            <el-input-number
              v-model="queryForm.minHeadlineLen"
              :min="0"
              placeholder="最小长度"
              style="width: 150px;"
            />
            <span style="margin: 0 10px;">至</span>
            <el-input-number
              v-model="queryForm.maxHeadlineLen"
              :min="0"
              placeholder="最大长度"
              style="width: 150px;"
            />
          </el-form-item>
  
          <el-form-item label="内容长度:">
            <el-input-number
              v-model="queryForm.minContentLen"
              :min="0"
              placeholder="最小长度"
              style="width: 150px;"
            />
            <span style="margin: 0 10px;">至</span>
            <el-input-number
              v-model="queryForm.maxContentLen"
              :min="0"
              placeholder="最大长度"
              style="width: 150px;"
            />
          </el-form-item>
  
          <el-form-item>
            <el-button
              type="primary"
              @click="queryNewsStats"
              :loading="loading"
              :disabled="!canQuery"
            >
              查询
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>

        <!-- 用户ID预览 -->
        <div v-if="validUserIds.length > 0" class="user-ids-preview">
          <span class="preview-label">将查询用户：</span>
          <el-tag v-for="userId in validUserIds" :key="userId" class="user-tag">
            {{ userId }}
          </el-tag>
        </div>
  
        <!-- 结果列表 -->
        <div v-if="newsList.length > 0" class="data-table">
          <h3>查询结果</h3>
          <el-table :data="newsList" style="width: 100%" max-height="500">
            <el-table-column prop="category" label="新闻类型" width="150" />
            <el-table-column prop="headline" label="标题" />
            <el-table-column prop="topic" label="主题" width="150" />
            <el-table-column prop="browse_count" label="浏览次数" width="100" />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button
                  type="text"
                  @click="viewNewsContent(scope.row.news_id)"
                >
                  查看内容
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
  
        <!-- 空状态 -->
        <el-empty v-if="!loading && newsList.length === 0 && hasQueried" description="暂无数据" />
  
        <!-- 新闻内容弹窗 -->
        <el-dialog
          title="新闻内容"
          v-model="contentDialogVisible"
          width="50%"
          :before-close="handleCloseDialog"
        >
          <div v-if="newsContent" class="news-content">
            <h4>{{ newsContent.headline }}</h4>
            <p><strong>主题:</strong> {{ newsContent.topic }}</p>
            <p><strong>类型:</strong> {{ newsContent.category }}</p>
            <p><strong>内容:</strong> {{ newsContent.content || '无内容' }}</p>
          </div>
          <div v-else>暂无内容</div>
          <template #footer>
            <el-button @click="contentDialogVisible = false">关闭</el-button>
          </template>
        </el-dialog>
      </el-card>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { QuestionFilled } from '@element-plus/icons-vue'
  import { newsApi } from '../api/news'
  
  export default {
    name: 'NewsStats',
    components: {
      QuestionFilled
    },
    setup() {
      const loading = ref(false)
      const hasQueried = ref(false)
      const newsList = ref([])
      const contentDialogVisible = ref(false)
      const newsContent = ref(null)
      const showUserIdError = ref(false)
  
      // 默认时间范围 (2019-06-13 到 2019-07-03, 匹配后端数据可能的时间范围)
      const defaultTimeRange = [
        new Date('2019-06-13').getTime() / 1000,
        new Date('2019-07-03').getTime() / 1000
      ]
  
      const queryForm = reactive({
        timeRange: [...defaultTimeRange],
        topics: '',
        minHeadlineLen: null,
        maxHeadlineLen: null,
        minContentLen: null,
        maxContentLen: null,
        userIds: ''
      })
  
      const pickerOptions = {
        disabledDate(time) {
          const minDate = new Date('2019-06-13').getTime()
          const maxDate = new Date('2019-07-03').getTime()
          return time.getTime() < minDate || time.getTime() > maxDate
        }
      }

      // 解析并验证用户ID
      const validUserIds = computed(() => {
        if (!queryForm.userIds) return []
        return queryForm.userIds
          .split(',')
          .map(id => id.trim())
          .filter(id => id && !isNaN(id) && parseInt(id) > 0)
      })

      // 检查是否可以查询
      const canQuery = computed(() => {
        return queryForm.timeRange && 
               queryForm.timeRange.length === 2 && 
               validUserIds.value.length > 0
      })

      // 监听用户ID变化，自动隐藏错误提示
      watch(() => queryForm.userIds, () => {
        if (validUserIds.value.length > 0) {
          showUserIdError.value = false
        }
      })

      // 处理用户ID输入
      const handleUserIdInput = () => {
        showUserIdError.value = false
      }

      // 验证用户ID
      const validateUserId = () => {
        if (!queryForm.userIds.trim()) {
          showUserIdError.value = true
          return false
        }
        if (validUserIds.value.length === 0) {
          showUserIdError.value = true
          return false
        }
        showUserIdError.value = false
        return true
      }
  
      // 查询新闻统计
      const queryNewsStats = async () => {
        if (!queryForm.timeRange || !queryForm.timeRange.length) {
          ElMessage.warning('请选择时间范围')
          return
        }

        // 验证用户ID
        if (!validateUserId()) {
          ElMessage.warning('请输入至少一个有效的用户ID')
          return
        }
  
        loading.value = true
        hasQueried.value = true
  
        try {
          const params = {
            start_time: queryForm.timeRange[0],
            end_time: queryForm.timeRange[1],
            user_ids: validUserIds.value.join(',')
          }
  
          // 处理主题
          const topics = queryForm.topics
            .split(',')
            .map(topic => topic.trim())
            .filter(topic => topic)
          if (topics.length > 0) {
            params.topics = topics.join(',')
          }
  
          if (queryForm.minHeadlineLen) {
            params.min_headline_len = queryForm.minHeadlineLen
          }
          if (queryForm.maxHeadlineLen) {
            params.max_headline_len = queryForm.maxHeadlineLen
          }
          if (queryForm.minContentLen) {
            params.min_content_len = queryForm.minContentLen
          }
          if (queryForm.maxContentLen) {
            params.max_content_len = queryForm.maxContentLen
          }
  
          const response = await newsApi.getNewsStats(params)
          if (response.status === 'success') {
            newsList.value = response.data
            if (newsList.value.length === 0) {
              ElMessage.info('该条件下没有找到相关数据')
            }
          } else {
            ElMessage.error(response.message || '查询失败')
          }
        } catch (error) {
          console.error('查询错误:', error)
          ElMessage.error('查询失败，请稍后重试')
        } finally {
          loading.value = false
        }
      }
  
      // 查看新闻内容
      const viewNewsContent = async (newsId) => {
        try {
          // 从 newsList 中查找对应的新闻条目
          const newsItem = newsList.value.find(item => item.news_id === newsId)
          if (!newsItem) {
            ElMessage.error('未找到对应的新闻记录')
            return
          }
        
          const response = await newsApi.getNewsDetail(newsId)
          if (response.status === 'success') {
            newsContent.value = {
              headline: newsItem.headline || '无标题',
              topic: newsItem.topic || '无主题',
              category: newsItem.category || '无类型',
              content: response.data.content || '无内容'
            }
            contentDialogVisible.value = true
          } else {
            ElMessage.error(response.message || '获取新闻内容失败')
          }
        } catch (error) {
          console.error('获取新闻内容错误:', error)
          ElMessage.error('获取新闻内容失败，请稍后重试')
        }
      }
  
      // 关闭弹窗
      const handleCloseDialog = (done) => {
        newsContent.value = null
        done()
      }
  
      // 重置表单
      const resetForm = () => {
        queryForm.timeRange = [...defaultTimeRange]
        queryForm.topics = ''
        queryForm.minHeadlineLen = 0
        queryForm.maxHeadlineLen = 246
        queryForm.minContentLen = 0
        queryForm.maxContentLen = 238356
        queryForm.userIds = ''
        newsList.value = []
        hasQueried.value = false
        showUserIdError.value = false
      }
  
      return {
        loading,
        hasQueried,
        newsList,
        contentDialogVisible,
        newsContent,
        queryForm,
        pickerOptions,
        defaultTimeRange,
        showUserIdError,
        validUserIds,
        canQuery,
        handleUserIdInput,
        validateUserId,
        queryNewsStats,
        viewNewsContent,
        handleCloseDialog,
        resetForm
      }
    }
  }
  </script>
  
  <style scoped>
  .news-stats {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: bold;
  }
  
  .query-form {
    margin-bottom: 20px;
    padding: 20px;
    background-color: #f5f7fa;
    border-radius: 4px;
  }

  .input-error {
    border-color: #f56c6c !important;
  }

  .error-message {
    color: #f56c6c;
    font-size: 12px;
    margin-top: 5px;
    margin-left: 110px;
  }

  .help-icon {
    margin-left: 5px;
    color: #909399;
    cursor: help;
  }

  .user-ids-preview {
    margin: 15px 0;
    padding: 10px;
    background-color: #f0f9ff;
    border-radius: 4px;
    border-left: 4px solid #409eff;
  }

  .preview-label {
    color: #606266;
    margin-right: 10px;
  }

  .user-tag {
    margin-right: 8px;
  }
  
  .data-table {
    margin-top: 30px;
  }
  
  .data-table h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .news-content {
    line-height: 1.6;
  }
  
  .news-content h4 {
    margin-bottom: 10px;
  }
  
  .news-content p {
    margin-bottom: 10px;
  }
  </style>