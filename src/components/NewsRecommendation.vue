<!-- components/NewsRecommendation.vue -->
<template>
    <div class="news-recommendation">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>实时新闻推荐</span>
          </div>
        </template>
        
        <!-- 查询表单 -->
        <el-form :model="queryForm" :inline="true" class="query-form">
          <el-form-item label="用户ID:">
            <el-input-number 
              v-model="queryForm.userId" 
              :min="1" 
              placeholder="请输入用户ID"
              style="width: 200px;"
            />
          </el-form-item>
          
          <el-form-item label="推荐数量:">
            <el-select 
              v-model="queryForm.limit" 
              placeholder="选择推荐数量"
              style="width: 150px;"
            >
              <el-option label="5条" :value="5" />
              <el-option label="10条" :value="10" />
              <el-option label="15条" :value="15" />
              <el-option label="20条" :value="20" />
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="getRecommendations"
              :loading="loading"
            >
              获取推荐
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
        
        <!-- 统计信息 -->
        <div v-if="recommendations.length > 0" class="stats-container">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="推荐新闻总数" :value="recommendations.length" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="类别数量" :value="categoryCount" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="内容推荐" :value="contentBasedCount" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="协同过滤推荐" :value="collaborativeCount" />
            </el-col>
          </el-row>
        </div>
        
        <!-- 推荐结果展示 -->
        <div v-if="recommendations.length > 0" class="recommendation-container">
          <!-- 分类统计图表 -->
          <div class="chart-wrapper">
            <h3>推荐新闻分类分布</h3>
            <v-chart 
              class="chart" 
              :option="categoryChartOption" 
              :loading="loading"
            />
          </div>
          
          <!-- 推荐新闻列表 -->
          <div class="news-list">
            <h3>推荐新闻列表</h3>
            <el-table :data="recommendations" style="width: 100%">
              <el-table-column type="index" label="序号" width="60" />
              <el-table-column prop="news_id" label="新闻ID" width="80" />
              <el-table-column prop="headline" label="新闻标题" min-width="300">
                <template #default="scope">
                  <el-tooltip :content="scope.row.headline" placement="top">
                    <div class="headline-text">{{ scope.row.headline }}</div>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="120">
                <template #default="scope">
                  <el-tag>
                    {{ scope.row.category }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="topic" label="主题" width="150">
                <template #default="scope">
                  <el-tooltip :content="scope.row.topic" placement="top">
                    <div class="topic-text">{{ scope.row.topic || '无' }}</div>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column label="推荐类型" width="120">
                <template #default="scope">
                  <el-tag :type="getRecommendationType(scope.$index) === 'content' ? 'success' : 'info'">
                    {{ getRecommendationType(scope.$index) === 'content' ? '内容推荐' : '协同过滤' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty v-if="!loading && recommendations.length === 0 && hasQueried" description="暂无推荐数据" />
      </el-card>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { PieChart } from 'echarts/charts'
  import { ElMessage } from 'element-plus'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  // import { newsApi } from '../api/news'
  
  use([
    CanvasRenderer,
    PieChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent
  ])
  
  const mockRecommendationsData = [
  {
    news_id: 2001,
    headline: "New Policy Sparks Debate in Congress",
    category: "Politics",
    topic: "Legislation"
  },
  {
    news_id: 2002,
    headline: "Breakthrough in Quantum Computing Announced",
    category: "Finance",
    topic: "Innovation"
  },
  {
    news_id: 2003,
    headline: "Team USA Wins Gold in Olympics",
    category: "Sports",
    topic: "Olympics"
  },
  {
    news_id: 2004,
    headline: "Election Results: What’s Next for the Economy?",
    category: "Politics",
    topic: "Economy"
  },
  {
    news_id: 2005,
    headline: "AI Ethics Guidelines Released by Tech Council",
    category: "Technology",
    topic: "Ethics"
  },
  {
    news_id: 2006,
    headline: "Football Star Signs Record-Breaking Contract",
    category: "Sports",
    topic: "Contracts"
  },
  {
    news_id: 3001,
    headline: "Global Climate Summit Reaches Agreement",
    category: "Environment",
    topic: "Climate Change"
  },
  {
    news_id: 3002,
    headline: "New Space Mission Targets Mars",
    category: "Science",
    topic: "Space Exploration"
  },
  {
    news_id: 3003,
    headline: "Stock Market Trends for 2025",
    category: "Business",
    topic: "Finance"
  },
  {
    news_id: 3004,
    headline: "Health Tech Startup Raises $100M",
    category: "Technology",
    topic: "Startups"
  }
];
  export default {
    name: 'NewsRecommendation',
    components: {
      VChart
    },
    setup() {
      const loading = ref(false)
      const hasQueried = ref(false)
      const recommendations = ref([])
      
      const queryForm = reactive({
        userId: 1,
        limit: 10
      })
      
      // 计算属性
      const categoryCount = computed(() => {
        const categories = new Set(recommendations.value.map(item => item.category))
        return categories.size
      })
      
      // 模拟推荐类型判断 (前7条为内容推荐，后面为协同过滤)
      const contentBasedCount = computed(() => {
        return Math.min(7, recommendations.value.length)
      })
      
      const collaborativeCount = computed(() => {
        return Math.max(0, recommendations.value.length - 7)
      })
      
      // 分类图表配置
      const categoryChartOption = computed(() => {
        const categoryStats = {}
        recommendations.value.forEach(item => {
          categoryStats[item.category] = (categoryStats[item.category] || 0) + 1
        })
        
        const data = Object.entries(categoryStats).map(([name, value]) => ({ name, value }))
        
        return {
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left'
          },
          series: [
            {
              name: '新闻分类',
              type: 'pie',
              radius: '50%',
              data: data,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        }
      })
      
      // 获取推荐类型
      const getRecommendationType = (index) => {
        return index < 7 ? 'content' : 'collaborative'
      }
      
      // 获取推荐
//      const getRecommendations = async () => {
//        if (!queryForm.userId) {
//          ElMessage.warning('请输入用户ID')
//          return
//        }
        
//        loading.value = true
//        hasQueried.value = true
        
//        try {
//          const response = await newsApi.getUserRecommendations(queryForm.userId, queryForm.limit)
//          
//          if (response.status === 'success') {
//            recommendations.value = response.data || []
//            if (recommendations.value.length === 0) {
//              ElMessage.info('该用户暂无推荐数据')
//            } else {
//              ElMessage.success(`成功获取 ${recommendations.value.length} 条推荐新闻`)
//            }
//          } else {
//            ElMessage.error(response.message || '获取推荐失败')
//          }
//        } catch (error) {
//          console.error('获取推荐错误:', error)
//          ElMessage.error('获取推荐失败，请稍后重试')
//          recommendations.value = []
//        } finally {
//          loading.value = false
//        }
//      }
      // Get recommendations (mock)
    const getRecommendations = async () => {
      if (!queryForm.userId) {
        ElMessage.warning('请输入用户ID');
        return;
      }
      
      loading.value = true;
      hasQueried.value = true;
      
      try {
        // Simulate API response
        const response = {
          status: 'success',
          data: mockRecommendationsData.slice(0, queryForm.limit)
        };
        
        if (response.status === 'success') {
          recommendations.value = response.data || [];
          if (recommendations.value.length === 0) {
            ElMessage.info('该用户暂无推荐数据');
          } else {
            ElMessage.success(`成功获取 ${recommendations.value.length} 条推荐新闻`);
          }
        } else {
          ElMessage.error(response.message || '获取推荐失败');
        }
      } catch (error) {
        console.error('获取推荐错误:', error);
        ElMessage.error('获取推荐失败，请稍后重试');
        recommendations.value = [];
      } finally {
        loading.value = false;
      }
    };
      
      // 重置表单
      const resetForm = () => {
        queryForm.userId = 1
        queryForm.limit = 10
        recommendations.value = []
        hasQueried.value = false
      }
      
      return {
        loading,
        hasQueried,
        recommendations,
        queryForm,
        categoryCount,
        contentBasedCount,
        collaborativeCount,
        categoryChartOption,
        getRecommendationType,
        getRecommendations,
        resetForm
      }
    }
  }
  </script>
  
  <style scoped>
  .news-recommendation {
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
  
  .stats-container {
    margin: 20px 0;
    padding: 20px;
    background-color: #fafafa;
    border-radius: 4px;
  }
  
  .recommendation-container {
    margin-top: 20px;
  }
  
  .chart-wrapper {
    text-align: center;
    margin-bottom: 30px;
  }
  
  .chart-wrapper h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .chart {
    height: 300px;
    width: 100%;
  }
  
  .news-list {
    margin-top: 30px;
  }
  
  .news-list h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .headline-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 280px;
  }
  
  .topic-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 130px;
  }
  
  .headline-text:hover,
  .topic-text:hover {
    color: #409EFF;
    cursor: pointer;
  }
  </style>