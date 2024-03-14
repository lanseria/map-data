export interface ParkingSpotPointFeature {
  创建时间: number
  定位: {
    address: string
    adname: string
    cityname: string
    full_address: string
    location: string
    name: string
    pname: string
  }
  审核状态: string
  描述: string
  是否免费: string
  类型: string
  编号: string
  几小时免费: string
  节假日免费: boolean
  社交平台链接: {
    text: string
    link: string
  }
}

export interface ParkingSpotPointProps {
  id: string
  /**
   * 描述
   */
  desc: string
  /**
   * 免费颜色
   */
  color: string
  /**
   * 类型
   */
  type: string
  /**
   * 免费/收费
   */
  isFree: string
  /**
   * 是否节假日免费
   */
  holiday: boolean
  marker: string
  /**
   * 前几个小时免费
   */
  freeHours: string
  /**
   * 社交链接
   */
  link: string
}

export interface CountTree {
  label: string
  value: string
  count: number
  extra?: string
  children?: CountTree[]
}
