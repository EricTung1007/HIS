# AI Evaluation Report
**Model:** `qwen`
**Base URL:** `http://169.254.20.191:1234/v1`
**Timestamp:** `5/4/2026, 3:58:11 PM`
**Final Score:** 44/50

| # | Question | Expected Action | Actual Action | Output Data | Result |
|---|---|---|---|---|---|
| 1 | 血壓130/85 | vital_signs | vital_signs | `{"systolic_bp":"130","diastolic_bp":"85"}` | ✅ PASS |
| 2 | 體溫37.5度 | vital_signs | vital_signs | `{"temperature":37.5}` | ✅ PASS |
| 3 | 心跳88次 | vital_signs | vital_signs | `{"heart_rate":"88"}` | ✅ PASS |
| 4 | 血氧98% | vital_signs | vital_signs | `{"spo2":"98"}` | ✅ PASS |
| 5 | 體重55公斤 | vital_signs | vital_signs | `{"weight":"55"}` | ✅ PASS |
| 6 | 血糖 120 | vital_signs | vital_signs | `{"blood_glucose":"120"}` | ✅ PASS |
| 7 | 阿嬤說背部疼痛 4 分 | vital_signs | vital_signs | `{"pain_score":"4"}` | ✅ PASS |
| 8 | 呼吸 18 次 | vital_signs | vital_signs | `{"respiratory_rate":"18"}` | ✅ PASS |
| 9 | 量測血壓120/80，心跳70 | vital_signs | vital_signs | `{"systolic_bp":"120","diastolic_bp":"80","heart_rate":"70"}` | ✅ PASS |
| 10 | 發燒了 38.5度 | vital_signs | vital_signs | `{"temperature":38.5}` | ✅ PASS |
| 11 | 喝水200cc | intake | intake | `{"category":"口服","amount":"200"}` | ✅ PASS |
| 12 | 管灌250cc | intake | intake | `{"category":"管灌","amount":"250"}` | ✅ PASS |
| 13 | 點滴500cc | intake | intake | `{"category":"點滴","amount":"500"}` | ✅ PASS |
| 14 | 喝了一碗稀飯 | intake | intake | `{"category":"口服","amount":"150"}` | ✅ PASS |
| 15 | 補充牛奶 150ml | intake | intake | `{"category":"口服","amount":"150"}` | ✅ PASS |
| 16 | 下午茶吃水果 100g | intake | intake | `{"category":"口服","amount":"100"}` | ✅ PASS |
| 17 | 靜脈注射 100cc | intake | intake | `{"category":"點滴","amount":"100"}` | ✅ PASS |
| 18 | 點滴剩餘 100cc | intake | intake | `{"category":"點滴","amount":"100"}` | ✅ PASS |
| 19 | 管餵奶 180 | intake | intake | `{"category":"管灌","amount":"180"}` | ✅ PASS |
| 20 | 喝湯 50cc | intake | intake | `{"category":"口服","amount":"50"}` | ✅ PASS |
| 21 | 尿了300cc | output | output | `{"category":"尿液","amount":"300"}` | ✅ PASS |
| 22 | 大便一次 | output | output | `{"category":"糞便","amount":"1"}` | ✅ PASS |
| 23 | 引流袋 150cc | output | output | `{"category":"引流","amount":"150"}` | ✅ PASS |
| 24 | 嘔吐 50cc | output | output | `{"category":"嘔吐","amount":"50"}` | ✅ PASS |
| 25 | 軟便二次 | output | output | `{"category":"糞便","amount":"2"}` | ✅ PASS |
| 26 | 幫住民洗澡 | billing | billing | `{"code":"BA07","name":"協助沐浴"}` | ✅ PASS |
| 27 | 翻身拍背 | billing | billing | `{"code":"BA10","name":"翻身拍背"}` | ✅ PASS |
| 28 | 協助進食 | billing | billing | `{"code":"BA04","name":"協助進食"}` | ✅ PASS |
| 29 | 修剪指甲 | billing | billing | `{"code":"BA10","name":"修剪指甲"}` | ✅ PASS |
| 30 | 更換尿片 | billing | billing | `{"code":"BA07","name":"協助沐浴"}` | ❌ FAIL |
| 31 | 傷口換藥 | billing | nursing_note | `{"content":"傷口換藥"}` | ❌ FAIL |
| 32 | 肢體關節活動 | billing | billing | `{"code":"BA11","name":"肢體關節活動"}` | ✅ PASS |
| 33 | 陪同外出 | billing | billing | `{"code":"BA07","name":"協助沐浴"}` | ✅ PASS |
| 34 | 協助沐浴洗頭 | billing | billing | `{"code":"BA07","name":"協助沐浴"}` | ✅ PASS |
| 35 | 口腔清潔 | billing | billing | `{"code":"BA10","name":"翻身拍背"}` | ✅ PASS |
| 36 | 已給Metformin | mar | mar | `{"medication_name":"Metformin","status":"given"}` | ✅ PASS |
| 37 | 拒絕吃藥 | mar | mar | `{"status":"refused"}` | ✅ PASS |
| 38 | 脈優已服用 | mar | mar | `{"status":"given"}` | ✅ PASS |
| 39 | 加開 Aspirin 100mg 每天一次 | medication_order | medication_order | `{"medication_name":"Aspirin 100mg"}` | ✅ PASS |
| 40 | 醫師開了乙醯胺酚 500mg TID | medication_order | medication_order | `{"medication_name":"乙醯胺酚 500mg TID"}` | ✅ PASS |
| 41 | 心情穩定，沒有不舒服 | nursing_note | nursing_note | `{"content":"心情穩定，沒有不舒服"}` | ✅ PASS |
| 42 | 換到202房 | update_patient | update_patient | `{"room_no":"202"}` | ✅ PASS |
| 43 | 阿公今天很有精神 | family_log | nursing_note | `{"content":"阿公今天很有精神"}` | ❌ FAIL |
| 44 | 住民反應頭暈 | nursing_note | nursing_note | `{"content":"住民反應頭暈"}` | ✅ PASS |
| 45 | 編輯警告：對海鮮過敏 | update_patient | add_allergy | `{"allergen":"海鮮","reaction":"","severity":"moderate"}` | ❌ FAIL |
| 46 | 聯絡簿備註：家屬周五來訪 | family_log | family_log | `{"extra_notes":"家屬周五來訪","staff_notes":""}` | ✅ PASS |
| 47 | 傷口紅腫，已通知家屬 | nursing_note | nursing_note | `{"content":"傷口紅腫，已通知家屬"}` | ✅ PASS |
| 48 | 改床位到 B 床 | update_patient | update_patient | `{"room_no":"","bed_no":"B","notes":""}` | ✅ PASS |
| 49 | 詢問目前體溫多少 | query | query | `{}` | ❌ FAIL |
| 50 | 今天有沒有大便 | query | query | `{}` | ❌ FAIL |