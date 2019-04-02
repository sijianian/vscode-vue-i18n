import * as path from 'path'
import * as vscode from 'vscode'
import i18nFiles from './i18nFiles'
import Common from './Common'

export enum SAVE_TYPE {
  $t,
  i18n
}

let prevKey = ''

const transAndRefactor = async ({
  filePath,
  text,
  type,
  range
}: {
  filePath: string;
  text: string;
  type: SAVE_TYPE;
  range: vscode.Range;
}) => {
  let defaultKey = prevKey
  let valueSelection: undefined | [number, number] = undefined

  if (defaultKey) {
    const lastKeyPathIndex = defaultKey.lastIndexOf('.')

    defaultKey = defaultKey.substr(0, lastKeyPathIndex)
    defaultKey = `${defaultKey}.${Common.getUid()}`
    valueSelection = [lastKeyPathIndex + 1, defaultKey.length]
  } else {
    defaultKey = Common.getUid()
  }

  let key = await vscode.window.showInputBox({
    prompt: `请输入要保存的路径 (例如:home.document.title)`,
    valueSelection,
    value: defaultKey
  })

  if (!key) {
    return
  }

  const i18nFile = i18nFiles.getI18nFileByPath(filePath)
  let transData: any = i18nFile.getTransByKey(key)
  let firstTransData = transData[0]

  // 如果是目录，添加前缀
  if (firstTransData.isDirectory && key.split('.').length === 1) {
    key = `common.${key}`
    transData = i18nFile.getLngFilesByKey(key)
    firstTransData = transData[0]
  }

  // 已有翻译检测
  if (firstTransData.data) {
    const okText = '覆盖'
    const isReplace = await vscode.window.showInformationMessage(
      `已有对应翻译【${firstTransData.data}】, 覆盖吗？`,
      { modal: true },
      okText
    )

    if (isReplace !== okText) {
      return
    }
  }

  // 替换内容
  vscode.window.activeTextEditor.edit(editBuilder => {
    const value =
      type === SAVE_TYPE.$t ? `{{$t('${key}')}}` : `i18n.t('${key}')`

    if (type === SAVE_TYPE.i18n) {
      const newStart = range.start.with(
        range.start.line,
        range.start.character - 1
      )
      const newEnd = range.end.with(range.end.line, range.end.character + 1)
      range = range.with(newStart, newEnd)
    }

    editBuilder.replace(range, value)
  })

  // 写入翻译
  const transZhCN = transData.find(item => item.lng === 'zh-CN')
  transZhCN.data = text

  const transByApiData = await i18nFiles.getTransByApi(transData)
  i18nFile.writeTransByKey(key, transByApiData)

  // 提示翻译
  const transEn = transData.find(item => item.lng === 'en')
  transEn && vscode.window.showInformationMessage(`翻译结果: ${transEn.data}`)

  // 记住上一次的key
  prevKey = key
}

export default transAndRefactor
