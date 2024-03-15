import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from 'node:process'
import { BaseClient } from '@lark-base-open/node-sdk'
import * as turf from '@turf/turf'
import type { Position } from 'gcoord'
import gcoord from 'gcoord'
import 'dotenv/config'
import cities from '../resource/cities.json'
import provinces from '../resource/provinces.json'
import type { CountTree, ParkingSpotPointFeature, ParkingSpotPointProps } from './types'

// 新建 BaseClient，填上需要操作的 Base 文档对应的 appToken 和 personalBaseToken
const client = new BaseClient({
  // https://enjqkboeqf.feishu.cn/base/N3mrbPD2qaX6UPstzEGc4OsenIb?table=tblpjzfblRoqDbqX&view=vew52RbN1t
  appToken: env.APPTOKEN as string,
  personalBaseToken: env.PERSONALBASETOKEN as string,
})
// 列出数据表记录
const res = await client.base.appTableRecord.list({
  // 路径参数。我们会自动为你填充 app_token（appToken）参数，你无需手动添加
  path: {
    table_id: env.TABLE_ID as string,
  },
  // 查询参数
  params: {
    page_size: 100,
  },
})
// color 颜色
const colorMap = {
  '收费': '#C24740',
  '免费': '#50C240',
  '私人/内部': '#EE8923',
  '路边': '#444444',
  '露天/无顶棚': '#EB78BA',
  '室内/有顶棚': '#51B945',
  '地下': '#1D4099',
  '禁止停车': '#D14742',
}
// 点集合，按照城市分类
const pointCollection: Record<string, turf.Feature<turf.Point, ParkingSpotPointProps>[]> = {}
function numToFixed4(coordinates: Position) {
  return coordinates.map(item => Number.parseFloat(Number(item).toFixed(5)))
}
if (res.code === 0) {
  if (res.data) {
    writeFile('data/output.json', JSON.stringify(res.data, null, 2))
    const passedItems = res.data.items?.filter(item => item.fields.审核状态 === '审核通过') || []
    passedItems.forEach((item) => {
      const fields = item.fields as unknown as ParkingSpotPointFeature
      const coordinates_gcj: Position = fields.定位.location.split(',').map(item => Number(item)) as Position
      const coordinates_wgs = gcoord.transform(
        coordinates_gcj, // 经纬度坐标
        gcoord.GCJ02, // 当前坐标系
        gcoord.WGS84, // 目标坐标系
      )
      const coordinates = numToFixed4(coordinates_wgs)
      const point = turf.point<ParkingSpotPointProps>(coordinates, {
        id: fields.编号,
        desc: fields.描述,
        type: fields.类型,
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        typeColor: colorMap[fields.类型],
        holiday: fields.节假日免费,
        freeMinutes: fields.多少分钟免费,
        isFree: fields.是否免费,
        // eslint-disable-next-line ts/ban-ts-comment
        // @ts-expect-error
        color: colorMap[fields.是否免费],
        marker: 'parking',
        link: fields.社交平台链接.link,
      })
      if (pointCollection[fields.定位.cityname]) {
        //
        pointCollection[fields.定位.cityname].push(point)
      }
      else {
        pointCollection[fields.定位.cityname] = [point]
      }
    })
    // 同时构建树结构
    const countTree: CountTree[] = []
    for (const key of Object.keys(pointCollection)) {
      const ele = pointCollection[key]
      const i = cities.findIndex(item => item.name === key)
      if (i >= 0) {
        const city = cities[i]
        const cityName = city.name
        const { provinceCode } = city

        const j = provinces.findIndex(item => item.code === provinceCode)
        const provinceName = provinces[j].name
        // 计算数量
        const cj = countTree.findIndex(item => item.value === provinceCode)
        if (cj >= 0) {
          countTree[cj].children!.push({
            value: city.code,
            label: cityName,
            count: ele.length,
            extra: provinceName,
          })
        }
        else {
          countTree.push({
            value: provinceCode,
            label: provinceName,
            count: 0,
            children: [{
              value: city.code,
              label: cityName,
              count: ele.length,
              extra: provinceName,
            }],
          })
        }
        const filePath = `data/parking-spot/${provinceName}/${cityName}.geojson`
        const directoryPath = path.dirname(filePath)
        console.warn(directoryPath)
        mkdir(directoryPath, { recursive: true }).then(() => {
          // featureCollection
          const featureCollection = turf.featureCollection(ele)
          writeFile(filePath, JSON.stringify(featureCollection, null, 2))
          console.warn(`File ${filePath} created successfully.`)
        })
      }
    }
    // 最后遍历countTree来计算province count
    countTree.forEach((item) => {
      item.count = item.children!.reduce((acc, cur) => acc + cur.count, 0)
    })
    writeFile('data/parking-spot/count.json', JSON.stringify(countTree, null, 2))
  }
}
