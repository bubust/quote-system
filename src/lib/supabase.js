/*
=============================================================
  SUPABASE SQL SETUP SCRIPT
  請複製以下所有 SQL 到 Supabase SQL Editor 執行
=============================================================

-- 1. construction_items（施工項目）
CREATE TABLE IF NOT EXISTS construction_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC,
  unit TEXT,
  base_notes TEXT,
  clickable_options TEXT[],
  is_window_type BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. quotes（報價案）
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT,
  address TEXT,
  renovation_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. quote_items（估價單明細）
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  sequence INTEGER,
  floor_location TEXT,
  work_type TEXT,
  item_name TEXT,
  unit_price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  length_cm NUMERIC,
  width_cm NUMERIC,
  height_cm NUMERIC,
  sort_order INTEGER,
  is_sub_item BOOLEAN DEFAULT FALSE,
  parent_id uuid,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. transport_settings（搬運費）
CREATE TABLE IF NOT EXISTS transport_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT,
  unit_price NUMERIC DEFAULT 0,
  last_quantity NUMERIC DEFAULT 0
);
INSERT INTO transport_settings (type_name, unit_price) VALUES
  ('打石工', 0), ('粗工', 0), ('垃圾車', 0), ('土車', 0)
ON CONFLICT DO NOTHING;

-- 5. company_settings（公司設定）
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT '優昇國際資產管理有限公司',
  owner_name TEXT DEFAULT '陳庚溥',
  phone TEXT DEFAULT '0911940368',
  tax_id TEXT DEFAULT '42917139',
  address TEXT DEFAULT '',
  quote_validity_days INTEGER DEFAULT 30
);
INSERT INTO company_settings (company_name, owner_name, phone, tax_id, address, quote_validity_days)
VALUES ('優昇國際資產管理有限公司', '陳庚溥', '0911940368', '42917139', '', 30)
ON CONFLICT DO NOTHING;

-- RLS: 允許 public 存取（開發/內部用途）
ALTER TABLE construction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access construction_items" ON construction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access quote_items" ON quote_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access transport_settings" ON transport_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);

=============================================================
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── 初始施工項目資料 ─────────────────────────────────────────────
export const INITIAL_CONSTRUCTION_ITEMS = [
  // 拆除保護工程
  { category: '拆除保護工程', item_name: '打除', unit_price: null, unit: null, base_notes: null,
    clickable_options: ['門窗拆除','二丁掛剃除','鐵皮拆除','地面打除','電表移置','廁所打除','雜項五金拆除','廚房打除','天花板拆除','櫃體拆除','扶手拆除','新增電箱'], is_window_type: false },
  { category: '拆除保護工程', item_name: '廢棄物清運', unit_price: null, unit: '式', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '拆除保護工程', item_name: '保護工程', unit_price: null, unit: '式', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '拆除保護工程', item_name: '材料、廢棄物搬運費', unit_price: null, unit: '式', base_notes: null, clickable_options: null, is_window_type: false },

  // 水電工程
  { category: '水電工程', item_name: '配置主要電力管線', unit_price: null, unit: null,
    base_notes: '各樓層配置更換開關箱 原線路電線抽換 插座：2.0MM電線 燈路：2.0MM電線 廚房專用插座：5.5MM 冷氣專用插座：5.5MM 開關：國際牌星光系列 東元無熔絲開關 浴室、廚房配置漏電斷路器 進屋線及主幹線14MM電線 客廳房間廚房四邊均要插座含接地 各房間均會有冷氣電源', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '配置弱電管線', unit_price: null, unit: null,
    base_notes: '各樓層配置弱電箱 Cat.6網路線及管路 電視管路 每層樓前、後陽台(廚房外除外)及大門外加監視器線路', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '配置冷、熱、污、排管線', unit_price: null, unit: null,
    base_notes: '新設管道間供1、2、3樓使用 冷水管：6分管PVC水管 熱水管：4分管不鏽鋼管 汙水管：4英吋PVC水管 排水管：2英吋PVC水管 水塔重新配線', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '化糞池', unit_price: null, unit: null,
    base_notes: 'RC 6人份化糞池 管線配置、地面開挖', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '衛浴設備安裝', unit_price: null, unit: '套',
    base_notes: '設備：馬桶、洗手台、鏡子、毛巾架、沐浴龍頭', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '2T水塔', unit_price: null, unit: null,
    base_notes: '品牌：穎昌 含配管、雷達開關', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '1/4恆壓加壓機', unit_price: null, unit: null,
    base_notes: '大井 TQ200B 1/4HP', clickable_options: null, is_window_type: false },
  { category: '水電工程', item_name: '抽水馬達', unit_price: null, unit: null,
    base_notes: '大井 HS400 1/2HP', clickable_options: null, is_window_type: false },

  // 泥作工程
  { category: '泥作工程', item_name: '砌磚', unit_price: 9500, unit: '坪', base_notes: '紅磚砌牆、打底、粉光', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '翻修廁所', unit_price: 160000, unit: '式',
    base_notes: '尺寸：262*162 CM\n磁磚：地磚30*30 壁磚30*60\n天花板：塑膠天花板\n門：木紋塑鋼門\n防水高度：180CM\n角隅防水抗裂貼附', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '抹牆打底', unit_price: 3500, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '30*60地磚', unit_price: 6000, unit: '坪', base_notes: '型號：\n尺寸：', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '30*30地磚', unit_price: 5200, unit: '坪', base_notes: '型號：\n尺寸：', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '60*60 拋光石英磚', unit_price: 7000, unit: '坪', base_notes: '型號：\n尺寸：', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '80*80 拋光石英磚', unit_price: 8700, unit: '坪', base_notes: '型號：\n尺寸：', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '陽台木紋磚', unit_price: 9000, unit: '坪', base_notes: '型號：\n尺寸：', clickable_options: null, is_window_type: false },
  { category: '泥作工程', item_name: '德國亨特超耐磨地板(森勳系列)', unit_price: 5200, unit: '坪', base_notes: '型號：\n尺寸：', clickable_options: null, is_window_type: false },

  // 門窗工程
  { category: '門窗工程', item_name: '車庫硫化銅門', unit_price: null, unit: null, base_notes: '型號： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '玄關硫化銅門', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '房間門', unit_price: null, unit: null, base_notes: '型號： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '白鐵門', unit_price: null, unit: null, base_notes: '型號： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '乾式施工封玻璃', unit_price: null, unit: null,
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '乾式施工窗戶', unit_price: 0.99, unit: null,
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: true },
  { category: '門窗工程', item_name: '乾式施工落地窗', unit_price: 0.88, unit: null,
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: true },
  { category: '門窗工程', item_name: '乾式施工三合一通風門', unit_price: 23000, unit: '樘',
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '濕式施工封玻璃', unit_price: null, unit: null,
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '濕式施工窗戶', unit_price: 0.95, unit: null,
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: true },
  { category: '門窗工程', item_name: '濕式施工落地窗', unit_price: 0.72, unit: null,
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: true },
  { category: '門窗工程', item_name: '濕式施工三合一通風門', unit_price: 21000, unit: '樘',
    base_notes: '品牌：大同鋁門窗 顏色：黑砂色 玻璃：五光強化 寬度： 尺寸： 包含紗窗', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '白鐵烤漆玻璃欄杆', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '鋁骨架烤漆玻璃欄杆', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '白鐵造型欄杆', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '鋁骨架造型欄杆', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '三合一通風門', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '門窗工程', item_name: '防盜窗 採光罩 外凸', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },

  // 輕隔間工程
  { category: '輕隔間工程', item_name: '矽酸鈣板單面隔間', unit_price: 3700, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '輕隔間工程', item_name: '矽酸鈣板雙面隔間', unit_price: 4300, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '輕隔間工程', item_name: '矽酸鈣板單面隔間 (60K隔音棉)', unit_price: 4500, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '輕隔間工程', item_name: '矽酸鈣板雙面隔間(60K隔音棉)', unit_price: 4900, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '輕隔間工程', item_name: '矽酸鈣暗架天花板', unit_price: 4200, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '輕隔間工程', item_name: '暗架維修孔', unit_price: 2000, unit: '個', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '輕隔間工程', item_name: '材料搬運', unit_price: 10000, unit: '式', base_notes: null, clickable_options: null, is_window_type: false },

  // 油漆工程
  { category: '油漆工程', item_name: '牆面批土修補', unit_price: null, unit: null, base_notes: null, clickable_options: null, is_window_type: false },
  { category: '油漆工程', item_name: '全室油漆', unit_price: null, unit: null, base_notes: '虹牌水泥漆', clickable_options: null, is_window_type: false },
  { category: '油漆工程', item_name: '仿清水模漆', unit_price: 6500, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },

  // 鐵工工程
  { category: '鐵工工程', item_name: '屋頂三合一鋼板(換皮)', unit_price: 4500, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '屋頂三合一鋼板(換皮換骨架)', unit_price: 9300, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '增建樓層鋼板', unit_price: 18500, unit: '坪',
    base_notes: '主梁、主柱:300/150。梅:300/150。橫梁:00/150。', clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '增建柱子', unit_price: 4550, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '牆壁包鐵皮(清板)', unit_price: 5410, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '企口板', unit_price: 3500, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '水切', unit_price: 230, unit: '坪', base_notes: '水切1:6', clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '白鐵水槽', unit_price: 440, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '白鐵天窗', unit_price: 6700, unit: '坪', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '拆除清運工資', unit_price: null, unit: null, base_notes: '通常抓一成', clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '吊車', unit_price: 145000, unit: '式', base_notes: null, clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '白鐵骨架採光罩', unit_price: null, unit: null,
    base_notes: '白鐵採光罩(黑砂) 5+5白膜玻璃 排水管', clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '鋁合金骨架採光罩', unit_price: null, unit: null,
    base_notes: '鋁合金採光罩(黑砂) 5+5白膜玻璃 排水管', clickable_options: null, is_window_type: false },

  // 鐵捲門工程（合併到鐵工工程下顯示）
  { category: '鐵工工程', item_name: '6A快速捲門(鍍鋁鋅材質)', unit_price: null, unit: null,
    base_notes: '捲門本體 傳動馬達 控制主機 白鐵軌道 烤漆秀面 烤漆封箱 零配件組', clickable_options: null, is_window_type: false },
  { category: '鐵工工程', item_name: '奧登堡快速捲門(鍍鋁鋅材質)', unit_price: null, unit: null,
    base_notes: '捲門本體 傳動馬達 控制主機 白鐵軌道 烤漆秀面 烤漆封箱 零配件組', clickable_options: null, is_window_type: false },

  // 鷹架工程（獨立類別）
  { category: '鷹架工程', item_name: '鷹架', unit_price: null, unit: null, base_notes: null, clickable_options: null, is_window_type: false },

  // 系統櫃工程（含廚具）
  { category: '系統櫃工程', item_name: '一字型廚具', unit_price: null, unit: null,
    base_notes: '尺寸: 枱面石英石 桶身E1板 門板美耐板C型把手 下櫃、吊廚 櫻花瓦斯爐 櫻花烘碗機 櫻花抽煙機 ST枱面抽拉水龍頭', clickable_options: null, is_window_type: false },
  { category: '系統櫃工程', item_name: 'L型廚具', unit_price: null, unit: null,
    base_notes: '尺寸: 枱面石英石 桶身E1板 門板美耐板C型把手 下櫃、吊廚 櫻花瓦斯爐 櫻花烘碗機 櫻花抽煙機 ST枱面抽拉水龍頭', clickable_options: null, is_window_type: false },
  { category: '系統櫃工程', item_name: '衣櫃', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '系統櫃工程', item_name: '鞋櫃', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '系統櫃工程', item_name: '電視櫃', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '系統櫃工程', item_name: '雜物櫃', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },
  { category: '系統櫃工程', item_name: '置物櫃', unit_price: null, unit: null, base_notes: '材質： 尺寸：', clickable_options: null, is_window_type: false },

  // 其他工程
  { category: '其他工程', item_name: '全室清潔(粗清)', unit_price: null, unit: null, base_notes: null, clickable_options: null, is_window_type: false },
]

// ─── Construction Items ──────────────────────────────────────────
export async function getConstructionItems() {
  const { data, error } = await supabase
    .from('construction_items')
    .select('*')
    .order('category')
    .order('item_name')
  if (error) throw error
  return data
}

export async function addConstructionItem(item) {
  const { data, error } = await supabase
    .from('construction_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateConstructionItem(id, updates) {
  const { data, error } = await supabase
    .from('construction_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteConstructionItem(id) {
  const { error } = await supabase
    .from('construction_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Quotes ──────────────────────────────────────────────────────
export async function listQuotes() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createQuote(quoteData) {
  const { data, error } = await supabase
    .from('quotes')
    .insert({ ...quoteData, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuoteMeta(id, quoteData) {
  const { data, error } = await supabase
    .from('quotes')
    .update({ ...quoteData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function renameQuote(id, newName) {
  const { data, error } = await supabase
    .from('quotes')
    .update({ project_name: newName, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteQuote(id) {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function saveQuote(quoteData, items) {
  let quote
  if (quoteData.id) {
    quote = await updateQuoteMeta(quoteData.id, {
      project_name: quoteData.project_name,
      address: quoteData.address,
      renovation_type: quoteData.renovation_type,
    })
  } else {
    quote = await createQuote({
      project_name: quoteData.project_name,
      address: quoteData.address,
      renovation_type: quoteData.renovation_type,
    })
  }

  if (items && items.length > 0) {
    await supabase.from('quote_items').delete().eq('quote_id', quote.id)
    const itemsToInsert = items.map((item, idx) => ({
      ...item,
      quote_id: quote.id,
      sort_order: idx,
    }))
    const { error } = await supabase.from('quote_items').insert(itemsToInsert)
    if (error) throw error
  }
  return quote
}

export async function loadQuote(id) {
  const { data: quote, error: qError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()
  if (qError) throw qError

  const { data: items, error: iError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order')
  if (iError) throw iError

  return { quote, items: items || [] }
}

// ─── Quote Items ─────────────────────────────────────────────────
export async function addQuoteItem(item) {
  const { data, error } = await supabase
    .from('quote_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuoteItem(id, updates) {
  const { data, error } = await supabase
    .from('quote_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteQuoteItem(id) {
  const { error } = await supabase
    .from('quote_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Transport Settings ───────────────────────────────────────────
export async function getTransportSettings() {
  const { data, error } = await supabase
    .from('transport_settings')
    .select('*')
    .order('type_name')
  if (error) throw error
  return data
}

export async function updateTransportSettings(id, updates) {
  const { data, error } = await supabase
    .from('transport_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Company Settings ─────────────────────────────────────────────
export async function getCompanySettings() {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCompanySettings(updates) {
  const { data: existing } = await supabase
    .from('company_settings')
    .select('id')
    .single()

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('company_settings')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    result = data
  } else {
    const { data, error } = await supabase
      .from('company_settings')
      .insert(updates)
      .select()
      .single()
    if (error) throw error
    result = data
  }
  return result
}

// ─── Seed Initial Data ────────────────────────────────────────────
export async function seedInitialData() {
  const { count } = await supabase
    .from('construction_items')
    .select('id', { count: 'exact', head: true })

  if (count && count > 0) return // 已有資料，不重複插入

  const { error } = await supabase
    .from('construction_items')
    .insert(INITIAL_CONSTRUCTION_ITEMS)
  if (error) {
    console.error('Seed error:', error)
    throw error
  }
}

// ─── LocalStorage Fallback ────────────────────────────────────────
const LS_QUOTES_KEY = 'qs_local_quotes'

function getLocalAll() {
  try { return JSON.parse(localStorage.getItem(LS_QUOTES_KEY) || '{}') } catch { return {} }
}

export function saveQuoteToLocal(quoteData, items) {
  const all = getLocalAll()
  const id = quoteData.id || ('local_' + Date.now())
  const quote = {
    ...quoteData,
    id,
    updated_at: new Date().toISOString(),
    created_at: quoteData.created_at || new Date().toISOString(),
  }
  all[id] = { quote, items: items || [] }
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(all))
  return quote
}

export function listLocalQuotes() {
  const all = getLocalAll()
  return Object.values(all)
    .map(e => e.quote)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

export function loadLocalQuote(id) {
  const all = getLocalAll()
  return all[id] || null
}

export function deleteLocalQuote(id) {
  const all = getLocalAll()
  delete all[id]
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(all))
}
