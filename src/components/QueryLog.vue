<!-- components/QueryLog.vue -->
<template>
    <div class="query-log">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>查询日志分析</span>
          </div>
        </template>
  
        <!-- 查询表单 -->
        <el-form :model="queryForm" :inline="true" class="query-form">
          <el-form-item label="记录数量:">
            <el-select v-model="queryForm.limit" placeholder="选择记录数量" style="width: 120px;">
              <el-option label="50" :value="50" />
              <el-option label="100" :value="100" />
              <el-option label="200" :value="200" />
              <el-option label="500" :value="500" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="queryLogs" :loading="loading">
              查询
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
  
        <!-- 统计信息 -->
        <div v-if="logData.length > 0" class="stats-container">
          <el-row :gutter="20">
            <el-col :span="4">
              <el-statistic title="总查询数" :value="logData.length" />
            </el-col>
            <el-col :span="4">
              <el-statistic title="成功查询" :value="successCount" />
            </el-col>
            <el-col :span="4">
              <el-statistic title="失败查询" :value="errorCount" />
            </el-col>
            <el-col :span="4">
              <el-statistic title="成功率" :value="successRate" suffix="%" />
            </el-col>
            <el-col :span="4">
              <el-statistic title="平均执行时间" :value="avgExecutionTime" suffix="ms" />
            </el-col>
            <el-col :span="4">
              <el-statistic title="最大执行时间" :value="maxExecutionTime" suffix="ms" />
            </el-col>
          </el-row>
        </div>
  
        <!-- 图表展示 -->
        <div v-if="logData.length > 0" class="chart-container">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="chart-wrapper">
                <h3>执行时间趋势</h3>
                <v-chart
                  ref="executionTimeChart"
                  class="chart"
                  :option="executionTimeOption"
                  :loading="loading"
                  :autoresize="false"
                />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="chart-wrapper">
                <h3>查询状态分布</h3>
                <v-chart
                  ref="statusPieChart"
                  class="chart"
                  :option="statusPieOption"
                  :loading="loading"
                  :autoresize="false"
                />
              </div>
            </el-col>
          </el-row>
          <el-row style="margin-top: 20px;">
            <el-col :span="24">
              <div class="chart-wrapper">
                <h3>查询频次时间分布</h3>
                <v-chart
                  ref="queryFrequencyChart"
                  class="chart-large"
                  :option="queryFrequencyOption"
                  :loading="loading"
                  :autoresize="false"
                />
              </div>
            </el-col>
          </el-row>
        </div>
  
        <!-- 数据表格 -->
        <div v-if="logData.length > 0" class="data-table">
          <h3>详细日志</h3>
          <el-table
            :data="logData"
            style="width: 100%"
            :max-height="500"
            stripe
          >
            <el-table-column prop="log_id" label="日志ID" width="80" />
            <el-table-column prop="query_timestamp" label="查询时间" width="180" />
            <el-table-column prop="query_text" label="查询语句" min-width="200" show-overflow-tooltip />
            <el-table-column prop="execution_time_ms" label="执行时间(ms)" width="120" align="right" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="scope">
                <el-tag
                  :type="scope.row.status === 'SUCCESS' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ scope.row.status === 'SUCCESS' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="error_message" label="错误信息" min-width="150" show-overflow-tooltip>
              <template #default="scope">
                <span v-if="scope.row.error_message" class="error-text">
                  {{ scope.row.error_message }}
                </span>
                <span v-else class="success-text">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
  
        <!-- 空状态 -->
        <el-empty v-if="!loading && logData.length === 0 && hasQueried" description="暂无日志数据" />
      </el-card>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed, nextTick, onUnmounted } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { LineChart, PieChart, BarChart } from 'echarts/charts'
  import { ElMessage } from 'element-plus'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  import { logApi } from '../api/news'
  
  use([
    CanvasRenderer,
    LineChart,
    PieChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  ])
  
  export default {
    name: 'QueryLog',
    components: {
      VChart
    },
    setup() {
      const loading = ref(false)
      const hasQueried = ref(false)
      const logData = ref([])
      const executionTimeChart = ref(null)
      const statusPieChart = ref(null)
      const queryFrequencyChart = ref(null)
  
      const queryForm = reactive({
        limit: 100,
      })
  
      const successCount = computed(() => {
        return logData.value.filter(item => item.status === 'SUCCESS').length
      })
  
      const errorCount = computed(() => {
        return logData.value.filter(item => item.status === 'FAILED').length
      })
  
      const successRate = computed(() => {
        if (logData.value.length === 0) return 0
        return ((successCount.value / logData.value.length) * 100).toFixed(1)
      })
  
      const avgExecutionTime = computed(() => {
        if (logData.value.length === 0) return 0
        const total = logData.value.reduce((sum, item) => sum + (item.execution_time_ms || 0), 0)
        return (total / logData.value.length).toFixed(1)
      })
  
      const maxExecutionTime = computed(() => {
        if (logData.value.length === 0) return 0
        return Math.max(...logData.value.map(item => item.execution_time_ms || 0))
      })
  
      // 图表配置
      const executionTimeOption = computed(() => ({
        tooltip: {
          trigger: 'axis',
          formatter: params => {
            const data = params[0]
            return `${data.name}<br/>执行时间: ${data.value}ms`
          }
        },
        xAxis: {
          type: 'category',
          data: logData.value.map(item => item.query_timestamp),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '执行时间(ms)'
        },
        series: [{
          data: logData.value.map(item => item.execution_time_ms || 0),
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#409EFF'
          },
          areaStyle: {
            color: 'rgba(64, 158, 255, 0.3)'
          }
        }],
        dataZoom: [
          {
            type: 'slider',
            start: 0,
            end: 100
          }
        ]
      }))
  
      const statusPieOption = computed(() => ({
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          bottom: '0%',
          left: 'center'
        },
        series: [
          {
            name: '查询状态',
            type: 'pie',
            radius: ['50%', '70%'],
            avoidLabelOverlap: false,
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '18',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: [
              { 
                value: successCount.value, 
                name: '成功',
                itemStyle: { color: '#67C23A' }
              },
              { 
                value: errorCount.value, 
                name: '失败',
                itemStyle: { color: '#F56C6C' }
              }
            ]
          }
        ]
      }))
  
      const queryFrequencyOption = computed(() => {
        const hourlyStats = {}
        logData.value.forEach(item => {
          const hour = new Date(item.query_timestamp).getHours()
          hourlyStats[hour] = (hourlyStats[hour] || 0) + 1
        })
  
        const hours = Array.from({length: 24}, (_, i) => i)
        const data = hours.map(hour => hourlyStats[hour] || 0)
  
        return {
          tooltip: {
            trigger: 'axis',
            formatter: '{b}点: {c}次查询'
          },
          xAxis: {
            type: 'category',
            data: hours.map(h => `${h}:00`),
            name: '小时'
          },
          yAxis: {
            type: 'value',
            name: '查询次数'
          },
          series: [{
            data: data,
            type: 'bar',
            itemStyle: {
              color: '#E6A23C'
            }
          }]
        }
      })
  
      // 查询日志
      const queryLogs = async () => {
        loading.value = true
        hasQueried.value = true
  
        try {
          const response = await logApi.getQueryLogs({
            limit: queryForm.limit
          })
  
          if (response.status === 'success') {
            logData.value = response.data
            if (logData.value.length === 0) {
              ElMessage.info('暂无日志数据')
            } else {
              // 等待 DOM 更新后再初始化图表
              await nextTick()
              resizeCharts()
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
        queryForm.limit = 100
        logData.value = []
        hasQueried.value = false
      }
  
      // 手动调整图表尺寸
      const resizeCharts = () => {
        if (executionTimeChart.value && executionTimeChart.value.echarts) {
          executionTimeChart.value.echarts.resize()
        }
        if (statusPieChart.value && statusPieChart.value.echarts) {
          statusPieChart.value.echarts.resize()
        }
        if (queryFrequencyChart.value && queryFrequencyChart.value.echarts) {
          queryFrequencyChart.value.echarts.resize()
        }
      }
  
      // 防抖调整图表尺寸
      let resizeTimeout
      const debounceResize = () => {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          resizeCharts()
        }, 200)
      }
  
      // 监听窗口调整
      window.addEventListener('resize', debounceResize)
  
      // 清理事件监听
      onUnmounted(() => {
        window.removeEventListener('resize', debounceResize)
      })
  
      return {
        loading,
        hasQueried,
        logData,
        queryForm,
        successCount,
        errorCount,
        successRate,
        avgExecutionTime,
        maxExecutionTime,
        executionTimeOption,
        statusPieOption,
        queryFrequencyOption,
        queryLogs,
        resetForm,
        executionTimeChart,
        statusPieChart,
        queryFrequencyChart
      }
    }
  }
  </script>
  
  <style scoped>
  .query-log {
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
  
  .chart-container {
    margin: 20px 0;
  }
  
  .chart-wrapper {
    text-align: center;
  }
  
  .chart-wrapper h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .chart {
    width: 100%;
    height: 300px;
  }
  
  .chart-large {
    width: 100%;
    height: 400px;
  }
  
  .data-table {
    margin-top: 30px;
  }
  
  .data-table h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .error-text {
    color: #F56C6C;
  }
  
  .success-text {
    color: #67C23A;
  }
  </style>