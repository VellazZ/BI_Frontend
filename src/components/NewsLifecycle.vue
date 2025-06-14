<!-- components/NewsLifecycle.vue -->
<template>
    <div class="news-lifecycle">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>新闻生命周期分析</span>
          </div>
        </template>
        
        <!-- 查询表单 -->
        <el-form :model="queryForm" :inline="true" class="query-form">
          <el-form-item label="新闻ID:">
            <el-input-number 
              v-model="queryForm.newsId" 
              :min="1" 
              placeholder="请输入新闻ID"
              style="width: 200px;"
            />
          </el-form-item>
          
          <el-form-item label="时间范围:">
            <el-date-picker
              v-model="queryForm.timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="X"
              :default-value="defaultTimeRange"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="queryLifecycle"
              :loading="loading"
            >
              查询
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
        
        <!-- 结果展示 -->
        <div v-if="chartData.length > 0" class="chart-container">
          <div class="chart-info">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-statistic title="总浏览次数" :value="totalBrowseCount" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="总浏览时长(秒)" :value="totalDuration" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="平均每次浏览时长" :value="avgDuration" suffix="秒" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="数据点数量" :value="chartData.length" />
              </el-col>
            </el-row>
          </div>
          
          <div class="charts">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-wrapper">
                  <h3>浏览次数时间分布</h3>
                  <v-chart 
                    class="chart" 
                    :option="browseCountOption" 
                    :loading="loading"
                  />
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-wrapper">
                  <h3>浏览时长时间分布</h3>
                  <v-chart 
                    class="chart" 
                    :option="durationOption" 
                    :loading="loading"
                  />
                </div>
              </el-col>
            </el-row>
            
            <el-row style="margin-top: 20px;">
              <el-col :span="24">
                <div class="chart-wrapper">
                  <h3>综合生命周期趋势</h3>
                  <v-chart 
                    class="chart-large" 
                    :option="combinedOption" 
                    :loading="loading"
                  />
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
        
        <!-- 数据表格 -->
        <div v-if="chartData.length > 0" class="data-table">
          <h3>详细数据</h3>
          <el-table :data="chartData" style="width: 100%">
            <el-table-column prop="hour_stamp" label="时间" width="200" />
            <el-table-column prop="browse_count" label="浏览次数" width="120" />
            <el-table-column prop="total_duration" label="总浏览时长(秒)" width="150" />
            <el-table-column label="平均时长(秒)" width="130">
              <template #default="scope">
                {{ (scope.row.total_duration / scope.row.browse_count).toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 空状态 -->
        <el-empty v-if="!loading && chartData.length === 0 && hasQueried" description="暂无数据" />
      </el-card>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { LineChart, BarChart } from 'echarts/charts'
  import { ElMessage } from 'element-plus'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  import { newsApi } from '../api/news'
  
  use([
    CanvasRenderer,
    LineChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  ])
  
  export default {
    name: 'NewsLifecycle',
    components: {
      VChart
    },
    setup() {
      const loading = ref(false)
      const hasQueried = ref(false)
      const chartData = ref([])
      
      // 默认时间范围 (2019-06-13 00:00:00 到 2019-07-03 23:59:59)
      const defaultTimeRange = [
        new Date('2019-06-13 00:00:00').getTime() / 1000,
        new Date('2019-07-03 23:59:59').getTime() / 1000
      ]
      
      const queryForm = reactive({
        newsId: 1,
        timeRange: [...defaultTimeRange]
      })
      
      // 计算属性
      const totalBrowseCount = computed(() => {
        return chartData.value.reduce((sum, item) => sum + item.browse_count, 0)
      })
      
      const totalDuration = computed(() => {
        return chartData.value.reduce((sum, item) => sum + item.total_duration, 0)
      })
      
      const avgDuration = computed(() => {
        if (totalBrowseCount.value === 0) return 0
        return (totalDuration.value / totalBrowseCount.value).toFixed(2)
      })
      
      // 图表配置
      const browseCountOption = computed(() => ({
        tooltip: {
          trigger: 'axis',
          formatter: '{b}<br/>浏览次数: {c}'
        },
        xAxis: {
          type: 'category',
          data: chartData.value.map(item => item.hour_stamp),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '浏览次数'
        },
        series: [{
          data: chartData.value.map(item => item.browse_count),
          type: 'bar',
          itemStyle: {
            color: '#409EFF'
          }
        }]
      }))
      
      const durationOption = computed(() => ({
        tooltip: {
          trigger: 'axis',
          formatter: '{b}<br/>总时长: {c}秒'
        },
        xAxis: {
          type: 'category',
          data: chartData.value.map(item => item.hour_stamp),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '时长(秒)'
        },
        series: [{
          data: chartData.value.map(item => item.total_duration),
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#67C23A'
          }
        }]
      }))
      
      const combinedOption = computed(() => ({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['浏览次数', '总时长(秒)']
        },
        xAxis: {
          type: 'category',
          data: chartData.value.map(item => item.hour_stamp),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '浏览次数',
            position: 'left',
            axisLabel: {
              formatter: '{value}'
            }
          },
          {
            type: 'value',
            name: '时长(秒)',
            position: 'right',
            axisLabel: {
              formatter: '{value}s'
            }
          }
        ],
        series: [
          {
            name: '浏览次数',
            type: 'bar',
            data: chartData.value.map(item => item.browse_count),
            itemStyle: {
              color: '#409EFF'
            }
          },
          {
            name: '总时长(秒)',
            type: 'line',
            yAxisIndex: 1,
            data: chartData.value.map(item => item.total_duration),
            smooth: true,
            itemStyle: {
              color: '#67C23A'
            }
          }
        ],
        dataZoom: [
          {
            type: 'slider',
            start: 0,
            end: 100
          }
        ]
      }))
      
      // 查询新闻生命周期
      const queryLifecycle = async () => {
        if (!queryForm.newsId) {
          ElMessage.warning('请输入新闻ID')
          return
        }
        
        loading.value = true
        hasQueried.value = true
        
        try {
          const startTime = queryForm.timeRange[0]
          const endTime = queryForm.timeRange[1]
          
          const response = await newsApi.getNewsLifecycle(queryForm.newsId, startTime, endTime)
          
          if (response.status === 'success') {
            // 将total_duration转换为数值类型
            chartData.value = response.data.map(item => ({
                ...item,
                total_duration: Number(item.total_duration) // 转换为数值
            }))
            if (chartData.value.length === 0) {
              ElMessage.info('该时间段内没有找到相关数据')
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
      
      // 重置表单
      const resetForm = () => {
        queryForm.newsId = 1
        queryForm.timeRange = [...defaultTimeRange]
        chartData.value = []
        hasQueried.value = false
      }
      
      return {
        loading,
        hasQueried,
        chartData,
        queryForm,
        defaultTimeRange,
        totalBrowseCount,
        totalDuration,
        avgDuration,
        browseCountOption,
        durationOption,
        combinedOption,
        queryLifecycle,
        resetForm
      }
    }
  }
  </script>
  
  <style scoped>
  .news-lifecycle {
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
  
  .chart-container {
    margin-top: 20px;
  }
  
  .chart-info {
    margin-bottom: 30px;
    padding: 20px;
    background-color: #fafafa;
    border-radius: 4px;
  }
  
  .charts {
    margin-bottom: 30px;
  }
  
  .chart-wrapper {
    text-align: center;
  }
  
  .chart-wrapper h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .chart {
    height: 300px;
    width: 100%;
  }
  
  .chart-large {
    height: 400px;
    width: 100%;
  }
  
  .data-table {
    margin-top: 30px;
  }
  
  .data-table h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  </style>