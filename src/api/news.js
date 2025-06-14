// api/news.js
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'http://8.133.4.100:5000', // 根据你的后端地址调整
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.params)
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    console.log('API响应:', response.status, response.data)
    return response.data
  },
  error => {
    console.error('响应错误:', error)
    if (error.response) {
      // 服务器返回错误状态码
      ElMessage.error(`服务器错误: ${error.response.status}`)
    } else if (error.request) {
      // 请求发送失败
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      // 其他错误
      ElMessage.error('请求失败')
    }
    return Promise.reject(error)
  }
)

// 新闻相关API
export const newsApi = {
  /**
   * 获取新闻生命周期数据
   * @param {number} newsId - 新闻ID
   * @param {number} startTime - 开始时间戳
   * @param {number} endTime - 结束时间戳
   * @returns {Promise} API响应
   */
  getNewsLifecycle(newsId, startTime, endTime) {
    return apiClient.get(`/api/news/${newsId}/lifecycle`, {
      params: {
        start_time: startTime,
        end_time: endTime
      }
    })
  },

  /**
   * 获取新闻分类统计
   * @param {object} params - 查询参数
   * @returns {Promise} API响应
   */
  getCategoryStats(params) {
    return apiClient.get('/api/categories/stats', { params })
  },

  /**
   * 获取用户兴趣分析数据
   * @param {object} params - 查询参数
   * @param {number} params.user_id - 用户ID
   * @param {number} params.start_day - 开始日期戳
   * @param {number} params.end_day - 结束日期戳
   * @returns {Promise} API响应
   */
  getUserInterests(params) {
    const { user_id, start_day, end_day } = params
    return apiClient.get(`/api/users/${user_id}/interests`, {
      params: {
        start_day,
        end_day
      }
    })
  },

  /**
   * 综合查询
   * @param {object} params - 查询参数
   * @returns {Promise} API响应
   */
  getNewsStats(params) {
    return apiClient.get('/api/news/stats', { params })
  },
  getNewsDetail(newsId) {
    return apiClient.get(`/api/news/${newsId}`)
  },

  /**
   * 爆款新闻分析
   * @param {object} params - 查询参数
   * @returns {Promise} API响应
   */
  getPopularAnalysis(params) {
    return apiClient.get('/api/news/popular-analysis', { params })
  },

  /**
   * 获取推荐新闻
   * @param {object} params - 查询参数
   * @returns {Promise} API响应
   */
  getRecommendations(params) {
    return apiClient.get('/api/news/recommendations', { params })
  },

  getFeatureImportance() {
    return apiClient.get('/api/analysis/feature-importance')
  },

  getTrendingNews(limit = 20) {
    return apiClient.get('/api/news/trending', {
      params: {
        limit
      }
    })
  },

  getUserRecommendations(userId, limit = 10) {
    return apiClient.get(`/api/users/${userId}/recommendations`, {
      params: {
        limit
      }
    })
  }
}

// 查询日志API
export const logApi = {
  /**
   * 获取查询日志
   * @param {object} params - 查询参数
   * @returns {Promise} API响应
   */
  getQueryLogs(params) {
    return apiClient.get('/api/logs/queries', { params })
  },

  /**
   * 获取性能统计
   * @returns {Promise} API响应
   */
  getPerformanceStats() {
    return apiClient.get('/api/logs/performance')
  }
}

export default apiClient