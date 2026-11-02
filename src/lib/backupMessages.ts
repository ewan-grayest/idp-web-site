/**
 * Step and error messages of backup tasks, per admin language. The server records a key and its values;
 * the admin page shows them in the reader's language (English is the fallback and the server's own text).
 */
type Vars = Record<string, string | number>
type Messages = Record<string, (v: Vars) => string>

const en: Messages = {
  savingDb: () => 'Saving the database',
  savingCurrent: () => 'Saving the current state first',
  savingMedia: () => 'Saving photos and videos',
  checksums: () => 'Writing checksums',
  saved: (v) => `Saved ${v.name}: ${v.tables} tables, ${v.files} files`,
  removedOld: (v) => `Removed old backup ${v.name}`,
  archiveOk: () => 'Archive checksum OK',
  noSidecar: () => 'No .sha256 file beside it: checking the files inside only',
  insideOk: () => 'Checksums of the files inside OK',
  mediaReadable: (v) => `Photos and videos readable: ${v.files} files`,
  testLoad: () => 'Test-loading the database into a temporary copy (the site is not touched)',
  dbLoads: (v) => `Database loads cleanly: all ${v.tables} tables have the same rows`,
  checking: (v) => `Checking ${v.name}`,
  currentSaved: (v) => `Current state saved as ${v.name}`,
  loadingNew: () => 'Loading the backup into a new database beside the live one',
  unpackingMedia: () => 'Unpacking photos and videos beside the live ones',
  switching: () => 'Switching the site to the restored data',
  restored: (v) => `Restored: database (${v.tables} tables) and ${v.files} photo and video files`,
  restarting: () => 'Restarting the site',
  restartDev: () => 'Restart the dev server (npm run dev) to see the restored data',
  // errors
  locked: () => 'Another backup or restore is running (perhaps the nightly backup). Try again in a few minutes.',
  busy: () => 'Another task is still running. Wait for it to finish.',
  badName: () => 'Not a backup file name',
  inUse: () => 'This backup is in use by a running task',
  damaged: () => 'The file is damaged or incomplete (its checksum does not match)',
  cannotUnpack: () => 'The file cannot be unpacked: it is damaged or not a backup',
  notBackup: () => 'Not a site backup (manifest or checksums missing)',
  missingFile: (v) => `${v.file} is missing from the backup`,
  damagedFile: (v) => `${v.file} inside the backup is damaged`,
  mediaCount: (v) => `media.tar lists ${v.got} files, the backup says ${v.want}`,
  dumpBad: (v) => `The database in the backup does not restore cleanly: ${v.detail}`,
  countsDiffer: () => 'Row counts after loading the database differ from the backup',
  newerCode: (v) => `The backup comes from newer site code (database version ${v.migration}). Update the site first.`,
  dbBusy: () => 'The live database stayed busy; nothing was changed. Try again.',
  notBackupUpload: () => 'This is not a site backup (it must be an idp-….tar file made by the site or scripts/backup.sh)',
  tool: (v) => `A tool failed: ${v.detail}`,
}

const ru: Messages = {
  savingDb: () => 'Сохраняю базу данных',
  savingCurrent: () => 'Сначала сохраняю текущее состояние',
  savingMedia: () => 'Сохраняю фото и видео',
  checksums: () => 'Записываю контрольные суммы',
  saved: (v) => `Сохранено ${v.name}: ${v.tables} таблиц, ${v.files} файлов`,
  removedOld: (v) => `Удалена старая копия ${v.name}`,
  archiveOk: () => 'Контрольная сумма архива верна',
  noSidecar: () => 'Рядом нет файла .sha256: проверяю только файлы внутри',
  insideOk: () => 'Контрольные суммы файлов внутри верны',
  mediaReadable: (v) => `Фото и видео читаются: ${v.files} файлов`,
  testLoad: () => 'Пробно загружаю базу во временную копию (сайт не затрагивается)',
  dbLoads: (v) => `База загружается без ошибок: во всех ${v.tables} таблицах те же строки`,
  checking: (v) => `Проверяю ${v.name}`,
  currentSaved: (v) => `Текущее состояние сохранено: ${v.name}`,
  loadingNew: () => 'Загружаю копию в новую базу рядом с рабочей',
  unpackingMedia: () => 'Распаковываю фото и видео рядом с рабочими',
  switching: () => 'Переключаю сайт на восстановленные данные',
  restored: (v) => `Восстановлено: база данных (${v.tables} таблиц) и ${v.files} файлов фото и видео`,
  restarting: () => 'Перезапускаю сайт',
  restartDev: () => 'Перезапустите сервер разработки (npm run dev), чтобы увидеть восстановленные данные',
  locked: () => 'Уже идёт другое копирование или восстановление (возможно, ночное). Попробуйте через несколько минут.',
  busy: () => 'Ещё выполняется другая задача. Дождитесь её окончания.',
  badName: () => 'Это не имя файла копии',
  inUse: () => 'Эта копия используется выполняемой задачей',
  damaged: () => 'Файл повреждён или неполный (контрольная сумма не совпадает)',
  cannotUnpack: () => 'Файл не распаковывается: он повреждён или это не копия',
  notBackup: () => 'Это не копия сайта (нет описания или контрольных сумм)',
  missingFile: (v) => `В копии нет файла ${v.file}`,
  damagedFile: (v) => `Файл ${v.file} внутри копии повреждён`,
  mediaCount: (v) => `В media.tar ${v.got} файлов, а в описании копии ${v.want}`,
  dumpBad: (v) => `База из копии не загружается без ошибок: ${v.detail}`,
  countsDiffer: () => 'Число строк после загрузки базы не совпадает с копией',
  newerCode: (v) => `Копия сделана более новой версией сайта (версия базы ${v.migration}). Сначала обновите сайт.`,
  dbBusy: () => 'Рабочая база была занята; ничего не изменено. Попробуйте ещё раз.',
  notBackupUpload: () => 'Это не копия сайта (нужен файл idp-….tar, сделанный сайтом или scripts/backup.sh)',
  tool: (v) => `Ошибка программы: ${v.detail}`,
}

const zh: Messages = {
  savingDb: () => '正在保存数据库',
  savingCurrent: () => '先保存当前状态',
  savingMedia: () => '正在保存照片和视频',
  checksums: () => '正在写入校验和',
  saved: (v) => `已保存 ${v.name}：${v.tables} 个表，${v.files} 个文件`,
  removedOld: (v) => `已删除旧备份 ${v.name}`,
  archiveOk: () => '归档校验和正确',
  noSidecar: () => '旁边没有 .sha256 文件：只检查内部文件',
  insideOk: () => '内部文件校验和正确',
  mediaReadable: (v) => `照片和视频可读取：${v.files} 个文件`,
  testLoad: () => '正在把数据库试加载到临时副本（不影响网站）',
  dbLoads: (v) => `数据库加载无误：全部 ${v.tables} 个表的行数一致`,
  checking: (v) => `正在检查 ${v.name}`,
  currentSaved: (v) => `当前状态已保存为 ${v.name}`,
  loadingNew: () => '正在把备份加载到正式数据库旁的新数据库',
  unpackingMedia: () => '正在正式文件旁解压照片和视频',
  switching: () => '正在把网站切换到恢复的数据',
  restored: (v) => `已恢复：数据库（${v.tables} 个表）和 ${v.files} 个照片视频文件`,
  restarting: () => '正在重启网站',
  restartDev: () => '请重启开发服务器（npm run dev）以查看恢复的数据',
  locked: () => '另一个备份或恢复正在进行（可能是夜间备份）。请几分钟后再试。',
  busy: () => '另一项任务仍在进行，请等待其完成。',
  badName: () => '不是备份文件名',
  inUse: () => '此备份正被运行中的任务使用',
  damaged: () => '文件已损坏或不完整（校验和不匹配）',
  cannotUnpack: () => '文件无法解压：已损坏或不是备份',
  notBackup: () => '不是网站备份（缺少描述或校验和）',
  missingFile: (v) => `备份中缺少 ${v.file}`,
  damagedFile: (v) => `备份中的 ${v.file} 已损坏`,
  mediaCount: (v) => `media.tar 中有 ${v.got} 个文件，备份描述为 ${v.want} 个`,
  dumpBad: (v) => `备份中的数据库无法正常加载：${v.detail}`,
  countsDiffer: () => '加载数据库后的行数与备份不一致',
  newerCode: (v) => `该备份来自更新版本的网站（数据库版本 ${v.migration}）。请先更新网站。`,
  dbBusy: () => '正式数据库一直繁忙，未做任何更改。请重试。',
  notBackupUpload: () => '这不是网站备份（需要由网站或 scripts/backup.sh 生成的 idp-….tar 文件）',
  tool: (v) => `程序出错：${v.detail}`,
}

const byLanguage: Record<string, Messages> = { en, ru, zh }

export type Message = { key: string; vars?: Vars }

/** The message in a language (English when the key or language is unknown) */
export function messageText(m: Message, language = 'en') {
  const fn = byLanguage[language]?.[m.key] ?? en[m.key]
  return fn ? fn(m.vars ?? {}) : m.key
}

/** An error the admin page can show in the reader's language */
export class BackupError extends Error {
  key: string
  vars?: Vars
  constructor(key: string, vars?: Vars) {
    super(messageText({ key, vars }))
    this.key = key
    this.vars = vars
  }
}
