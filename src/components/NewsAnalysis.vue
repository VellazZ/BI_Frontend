<!-- components/NewsAnalysis.vue -->
<template>
    <div class="news-analysis">
      <el-row :gutter="20">
        <!-- 特征重要性分析 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>特征重要性分析</span>
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="loadFeatureImportance"
                  :loading="featureLoading"
                >
                  分析爆款特征
                </el-button>
              </div>
            </template>
            
            <!-- 特征重要性图表 -->
            <div v-if="featureData.length > 0" class="chart-container">
              <div class="chart-info">
                <el-statistic 
                  title="分析特征数量" 
                  :value="featureData.length" 
                  suffix="个"
                />
              </div>
              
              <div class="chart-wrapper">
                <h4>Top 20 重要特征</h4>
                <v-chart 
                  class="chart" 
                  :option="featureImportanceOption" 
                  :loading="featureLoading"
                />
              </div>
              
              <!-- 特征数据表格 -->
              <div class="data-table">
                <h4>详细数据</h4>
                <el-table 
                  :data="featureData" 
                  style="width: 100%"
                  height="300"
                >
                  <el-table-column 
                    prop="feature" 
                    label="特征名称" 
                    width="200"
                    show-overflow-tooltip
                  />
                  <el-table-column 
                    prop="importance" 
                    label="重要性得分" 
                    width="150"
                  >
                    <template #default="scope">
                      {{ Number(scope.row.importance).toFixed(4) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="重要性等级" width="120">
                    <template #default="scope">
                      <el-tag 
                        :type="getImportanceLevel(scope.row.importance).type"
                        size="small"
                      >
                        {{ getImportanceLevel(scope.row.importance).label }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
            
            <el-empty 
              v-if="!featureLoading && featureData.length === 0 && featureQueried" 
              description="暂无特征分析数据" 
            />
          </el-card>
        </el-col>
        
        <!-- 热点新闻 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>当前热点新闻</span>
                <div>
                  <el-input-number
                    v-model="trendingLimit"
                    :min="5"
                    :max="50"
                    size="small"
                    style="width: 100px; margin-right: 10px;"
                  />
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="loadTrendingNews"
                    :loading="trendingLoading"
                  >
                    获取热点
                  </el-button>
                </div>
              </div>
            </template>
            
            <!-- 热点新闻列表 -->
            <div v-if="trendingData.length > 0" class="trending-container">
              <div class="chart-info">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-statistic 
                      title="热点新闻数量" 
                      :value="trendingData.length" 
                      suffix="条"
                    />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic 
                      title="平均热度得分" 
                      :value="avgHotnessScore" 
                      :precision="2"
                    />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic 
                      title="最高热度得分" 
                      :value="maxHotnessScore" 
                      :precision="2"
                    />
                  </el-col>
                </el-row>
              </div>
              
              <!-- 热度分布图表 -->
              <div class="chart-wrapper">
                <h4>热度得分分布</h4>
                <v-chart 
                  class="chart-small" 
                  :option="hotnessDistributionOption" 
                  :loading="trendingLoading"
                />
              </div>
              
              <!-- 热点新闻列表 -->
              <div class="news-list">
                <h4>热点新闻列表</h4>
                <div class="news-scroll">
                  <div 
                    v-for="(news, index) in trendingData" 
                    :key="news.news_id"
                    class="news-item"
                    :class="{ 'top-news': index < 3 }"
                  >
                    <div class="news-rank">
                      <el-tag 
                        :type="index < 3 ? 'danger' : index < 10 ? 'warning' : 'info'"
                        size="small"
                      >
                        #{{ index + 1 }}
                      </el-tag>
                    </div>
                    <div class="news-content">
                      <div class="news-title">{{ news.headline }}</div>
                      <div class="news-meta">
                        <el-tag size="mini" type="primary">{{ news.category }}</el-tag>
                        <span class="news-topic">{{ news.topic }}</span>
                        <span class="news-score">热度: {{ Number(news.hotness_score).toFixed(2) }}</span>
                      </div>
                      <div class="news-reason" v-if="news.reason">
                        <el-icon><InfoFilled /></el-icon>
                        {{ news.reason }}
                      </div>
                      <div class="news-time">
                        {{ formatTime(news.prediction_timestamp) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <el-empty 
              v-if="!trendingLoading && trendingData.length === 0 && trendingQueried" 
              description="暂无热点新闻数据" 
            />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { BarChart, LineChart } from 'echarts/charts'
  import { ElMessage } from 'element-plus'
  import { InfoFilled } from '@element-plus/icons-vue'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  // import { newsApi } from '../api/news'
  
  use([
    CanvasRenderer,
    BarChart,
    LineChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  ])

  // Mock data for simulation
const mockFeatureData = [
  { feature: "breaking", importance: 0.12 },
  { feature: "category_politics", importance: 0.10 },
  { feature: "sentiment_score", importance: 0.09 },
  { feature: "content_len", importance: 0.08 },
  { feature: "exclusive", importance: 0.07 },
  { feature: "category_technology", importance: 0.06 },
  { feature: "trending", importance: 0.05 },
  { feature: "source_cnn", importance: 0.04 },
  { feature: "category_entertainment", importance: 0.04 },
  { feature: "urgent", importance: 0.03 },
  { feature: "category_sports", importance: 0.03 },
  { feature: "scandal", importance: 0.03 },
  { feature: "source_bbc", importance: 0.02 },
  { feature: "category_health", importance: 0.02 },
  { feature: "viral", importance: 0.02 },
  { feature: "category_business", importance: 0.01 },
  { feature: "source_nytimes", importance: 0.01 },
  { feature: "controversial", importance: 0.01 },
  { feature: "category_science", importance: 0.01 },
  { feature: "celebrity", importance: 0.01 }
];

const mockTrendingData = [
  {
    news_id: 1001,
    headline: "Global Markets Surge After Unexpected Policy Shift",
    category: "Business",
    topic: "Economy",
    hotness_score: 0.95,
    reason: "High social media engagement and breaking news",
    prediction_timestamp: "2025-06-15 04:30:00"
  },
  {
    news_id: 1002,
    headline: "Tech Giant Unveils AI-Powered Smartphone",
    category: "Technology",
    topic: "Innovation",
    hotness_score: 0.92,
    reason: "Widespread shares on X and tech blogs",
    prediction_timestamp: "2025-06-15 04:15:00"
  },
  {
    news_id: 1003,
    headline: "Celebrity Scandal Rocks Entertainment Industry",
    category: "Entertainment",
    topic: "Celebrity News",
    hotness_score: 0.90,
    reason: "Viral spread on social platforms",
    prediction_timestamp: "2025-06-15 04:00:00"
  }
];
  
  export default {
    name: 'NewsAnalysis',
    components: {
      VChart,
      InfoFilled
    },
    setup() {
      // 特征重要性相关
      const featureLoading = ref(false)
      const featureQueried = ref(false)
      const featureData = ref([])
      
      // 热点新闻相关
      const trendingLoading = ref(false)
      const trendingQueried = ref(false)
      const trendingData = ref([])
      const trendingLimit = ref(20)
      
      // 计算属性
      const avgHotnessScore = computed(() => {
        if (trendingData.value.length === 0) return 0
        const sum = trendingData.value.reduce((acc, item) => acc + Number(item.hotness_score), 0)
        return sum / trendingData.value.length
      })
      
      const maxHotnessScore = computed(() => {
        if (trendingData.value.length === 0) return 0
        return Math.max(...trendingData.value.map(item => Number(item.hotness_score)))
      })
      
      // 特征重要性图表配置
      const featureImportanceOption = computed(() => ({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            const data = params[0]
            return `${data.name}<br/>重要性: ${Number(data.value).toFixed(4)}`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: '重要性得分'
        },
        yAxis: {
          type: 'category',
          data: featureData.value.map(item => item.feature).reverse(),
          axisLabel: {
            interval: 0,
            fontSize: 10,
            formatter: function(value) {
              return value.length > 15 ? value.substring(0, 15) + '...' : value
            }
          }
        },
        series: [{
          type: 'bar',
          data: featureData.value.map(item => Number(item.importance)).reverse(),
          itemStyle: {
            color: function(params) {
              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
              return colors[params.dataIndex % colors.length]
            }
          }
        }],
        dataZoom: [
          {
            type: 'slider',
            yAxisIndex: 0,
            start: 0,
            end: 100,
            width: 20,
            right: 10
          }
        ]
      }))
      
      // 热度分布图表配置
      const hotnessDistributionOption = computed(() => ({
        tooltip: {
          trigger: 'axis',
          formatter: '{b}<br/>热度得分: {c}'
        },
        xAxis: {
          type: 'category',
          data: trendingData.value.map((_, index) => `#${index + 1}`),
          axisLabel: {
            interval: 0,
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '热度得分'
        },
        series: [{
          data: trendingData.value.map(item => Number(item.hotness_score)),
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#409EFF'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(64, 158, 255, 0.6)'
              }, {
                offset: 1, color: 'rgba(64, 158, 255, 0.1)'
              }]
            }
          }
        }]
      }))
      
      // 获取重要性等级
      const getImportanceLevel = (importance) => {
        const score = Number(importance)
        if (score >= 0.1) return { type: 'danger', label: '极高' }
        if (score >= 0.05) return { type: 'warning', label: '高' }
        if (score >= 0.01) return { type: 'primary', label: '中' }
        return { type: 'info', label: '低' }
      }
      
      // 格式化时间
      const formatTime = (timestamp) => {
        if (!timestamp) return '-'
        const date = new Date(timestamp)
        return date.toLocaleString('zh-CN')
      }
      
      // 加载特征重要性分析
//      const loadFeatureImportance = async () => {
//        featureLoading.value = true
//        featureQueried.value = true
        
//        try {
//          const response = await newsApi.getFeatureImportance()
//          
//          if (response.status === 'success') {
//            featureData.value = response.data || []
//            if (featureData.value.length === 0) {
//              ElMessage.info('暂无特征分析数据')
//            } else {
//              ElMessage.success(`成功加载 ${featureData.value.length} 个特征`)
//            }
//          } else {
//            ElMessage.error(response.message || '获取特征重要性失败')
//          }
//        } catch (error) {
//          console.error('特征重要性分析错误:', error)
//          ElMessage.error('获取特征重要性失败，请稍后重试')
//        } finally {
//          featureLoading.value = false
//        }
//      }
      // Load feature importance (mock)
    const loadFeatureImportance = async () => {
      featureLoading.value = true;
      featureQueried.value = true;

      try {
        // Simulate API response
        const response = { status: 'success', data: mockFeatureData };
        if (response.status === 'success') {
          featureData.value = response.data || [];
          if (featureData.value.length === 0) {
            ElMessage.info('暂无特征分析数据');
          } else {
            ElMessage.success(`成功加载 ${featureData.value.length} 个特征`);
          }
        } else {
          ElMessage.error(response.message || '获取特征重要性失败');
        }
      } catch (error) {
        console.error('特征重要性分析错误:', error);
        ElMessage.error('获取特征重要性失败，请稍后重试');
      } finally {
        featureLoading.value = false;
      }
    };
      
      // 加载热点新闻
//      const loadTrendingNews = async () => {
//        trendingLoading.value = true
//        trendingQueried.value = true
        
//        try {
//          const response = await newsApi.getTrendingNews(trendingLimit.value)
          
//          if (response.status === 'success') {
//            trendingData.value = response.data || []
//            if (trendingData.value.length === 0) {
//              ElMessage.info('暂无热点新闻数据')
//            } else {
//              ElMessage.success(`成功加载 ${trendingData.value.length} 条热点新闻`)
//            }
//          } else {
//            ElMessage.error(response.message || '获取热点新闻失败')
//          }
//        } catch (error) {
//          console.error('热点新闻获取错误:', error)
//          ElMessage.error('获取热点新闻失败，请稍后重试')
//        } finally {
//          trendingLoading.value = false
//        }
//      }
      // Load trending news (mock)
    const loadTrendingNews = async () => {
      trendingLoading.value = true;
      trendingQueried.value = true;

      try {
        // Simulate API response
        const response = { status: 'success', data: mockTrendingData };
        if (response.status === 'success') {
          trendingData.value = response.data || [];
          if (trendingData.value.length === 0) {
            ElMessage.info('暂无热点新闻数据');
          } else {
            ElMessage.success(`成功加载 ${trendingData.value.length} 条热点新闻`);
          }
        } else {
          ElMessage.error(response.message || '获取热点新闻失败');
        }
      } catch (error) {
        console.error('热点新闻获取错误:', error);
        ElMessage.error('获取热点新闻失败，请稍后重试');
      } finally {
        trendingLoading.value = false;
      }
    };
      
      // 组件挂载时自动加载数据
      onMounted(() => {
        loadTrendingNews()
      })
      
      return {
        // 特征重要性
        featureLoading,
        featureQueried,
        featureData,
        featureImportanceOption,
        loadFeatureImportance,
        getImportanceLevel,
        
        // 热点新闻
        trendingLoading,
        trendingQueried,
        trendingData,
        trendingLimit,
        avgHotnessScore,
        maxHotnessScore,
        hotnessDistributionOption,
        loadTrendingNews,
        formatTime
      }
    }
  }
  </script>
  
  <style scoped>
  .news-analysis {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: bold;
  }
  
  .chart-container, .trending-container {
    margin-top: 20px;
  }
  
  .chart-info {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #fafafa;
    border-radius: 4px;
  }
  
  .chart-wrapper {
    margin-bottom: 20px;
    text-align: center;
  }
  
  .chart-wrapper h4 {
    margin-bottom: 15px;
    color: #303133;
    font-size: 14px;
  }
  
  .chart {
    height: 400px;
    width: 100%;
  }
  
  .chart-small {
    height: 250px;
    width: 100%;
  }
  
  .data-table {
    margin-top: 20px;
  }
  
  .data-table h4 {
    margin-bottom: 10px;
    color: #303133;
    font-size: 14px;
  }
  
  .news-list {
    margin-top: 20px;
  }
  
  .news-list h4 {
    margin-bottom: 15px;
    color: #303133;
    font-size: 14px;
  }
  
  .news-scroll {
    max-height: 500px;
    overflow-y: auto;
    border: 1px solid #ebeef5;
    border-radius: 4px;
  }
  
  .news-item {
    display: flex;
    padding: 15px;
    border-bottom: 1px solid #f0f2f5;
    transition: background-color 0.3s;
  }
  
  .news-item:hover {
    background-color: #f8f9fa;
  }
  
  .news-item:last-child {
    border-bottom: none;
  }
  
  .news-item.top-news {
    background-color: #fff7e6;
  }
  
  .news-rank {
    flex-shrink: 0;
    margin-right: 15px;
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
  }
  
  .news-content {
    flex: 1;
    min-width: 0;
  }
  
  .news-title {
    font-weight: 500;
    color: #303133;
    margin-bottom: 8px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .news-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  
  .news-topic {
    color: #606266;
    font-size: 12px;
  }
  
  .news-score {
    color: #409EFF;
    font-size: 12px;
    font-weight: 500;
  }
  
  .news-reason {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    color: #909399;
    font-size: 12px;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  
  .news-time {
    color: #c0c4cc;
    font-size: 11px;
  }
  
  /* 滚动条样式 */
  .news-scroll::-webkit-scrollbar {
    width: 6px;
  }
  
  .news-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  .news-scroll::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  .news-scroll::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  </style>