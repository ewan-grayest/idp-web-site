/**
 * Step and error messages of backup tasks, per admin language. The server records a key and its values;
 * the admin page shows them in the reader's language (English is the fallback and the server's own text).
 */
type Vars = Record<string, string | number>
type Messages = Record<string, (v: Vars) => string>

/** The stage of pg_restore in loadProgress (RestoreItem in backups.ts), per language */
const phases: Record<string, Record<string, string>> = {
  en: { schema: 'creating tables', data: 'loading rows', indexes: 'creating indexes and links' },
  ru: { schema: 'создаю таблицы', data: 'загружаю строки', indexes: 'создаю индексы и связи' },
  zh: { schema: '正在创建表', data: '正在加载数据行', indexes: '正在创建索引和关联' },
}

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
  safetySkipped: () => 'Not saving the current state first, as chosen',
  unchanged: () => "The site's data was not changed: it is as it was before the restore",
  // how the current step is getting on
  loadProgress: (v) => `${v.percent}%: ${phases.en[v.phase] ?? v.phase} (${v.name})`,
  countingRows: () => 'Comparing the rows of every table with the backup',
  dumpProgress: (v) => `Table ${v.name}`,
  filesProgress: (v) => (v.total !== undefined ? `${v.done} of ${v.total} files` : `${v.done} files`),
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
  cancelled: () => "Stopped. The site's data was not changed.",
  stalled: (v) =>
    `${v.tool} reported nothing for ${v.minutes} minutes and was stopped. The database may be unreachable or out of disk space: see Diagnostics and the database's log.`,
  noSpace: (v) => `Not enough free disk space in ${v.folder}: ${v.need} needed, ${v.free} free.`,
  noCreateDb: () => "The site's database account can't create databases (CREATEDB), which a restore and a full check need.",
  noMaintenanceDb: (v) => `Can't connect to the database server's maintenance database «postgres», which a restore and a full check need: ${v.detail}`,
  notRunning: () => 'This task is no longer running',
  tooLate: () => 'The restore is already switching the site and can no longer be stopped',
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
  safetySkipped: () => 'Текущее состояние не сохраняю: так выбрано',
  unchanged: () => 'Данные сайта не изменились: всё как до восстановления',
  loadProgress: (v) => `${v.percent}%: ${phases.ru[v.phase] ?? v.phase} (${v.name})`,
  countingRows: () => 'Сверяю строки всех таблиц с копией',
  dumpProgress: (v) => `Таблица ${v.name}`,
  filesProgress: (v) => (v.total !== undefined ? `${v.done} из ${v.total} файлов` : `${v.done} файлов`),
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
  cancelled: () => 'Остановлено. Данные сайта не изменились.',
  stalled: (v) =>
    `${v.tool} ничего не сообщал ${v.minutes} минут и был остановлен. Возможно, база данных недоступна или на её диске кончилось место: см. «Диагностика» и журнал базы данных.`,
  noSpace: (v) => `Не хватает места на диске в ${v.folder}: нужно ${v.need}, свободно ${v.free}.`,
  noCreateDb: () => 'Учётной записи сайта в базе данных нельзя создавать базы (CREATEDB), а это нужно для восстановления и полной проверки.',
  noMaintenanceDb: (v) => `Не удаётся подключиться к служебной базе «postgres» на сервере базы данных, а она нужна для восстановления и полной проверки: ${v.detail}`,
  notRunning: () => 'Эта задача уже не выполняется',
  tooLate: () => 'Восстановление уже переключает сайт, остановить его нельзя',
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
  safetySkipped: () => '按所选，不先保存当前状态',
  unchanged: () => '网站数据未更改：与恢复前相同',
  loadProgress: (v) => `${v.percent}%：${phases.zh[v.phase] ?? v.phase}（${v.name}）`,
  countingRows: () => '正在逐表核对数据行与备份是否一致',
  dumpProgress: (v) => `表 ${v.name}`,
  filesProgress: (v) => (v.total !== undefined ? `${v.done} / ${v.total} 个文件` : `${v.done} 个文件`),
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
  cancelled: () => '已停止。网站数据未更改。',
  stalled: (v) => `${v.tool} 在 ${v.minutes} 分钟内没有任何输出，已被停止。数据库可能无法连接，或其磁盘已满：请查看“诊断”页面和数据库日志。`,
  noSpace: (v) => `${v.folder} 所在磁盘空间不足：需要 ${v.need}，可用 ${v.free}。`,
  noCreateDb: () => '网站的数据库账户无权创建数据库（CREATEDB），而恢复和完整检查需要此权限。',
  noMaintenanceDb: (v) => `无法连接数据库服务器上的维护数据库“postgres”，而恢复和完整检查需要它：${v.detail}`,
  notRunning: () => '此任务已不在运行',
  tooLate: () => '恢复已在切换网站，现在无法停止',
}

const byLanguage: Record<string, Messages> = { en, ru, zh }

export type Message = { key: string; vars?: Vars }

/** A time span as m:ss, or h:mm:ss from an hour on, for the task's elapsed time */
export function duration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

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
