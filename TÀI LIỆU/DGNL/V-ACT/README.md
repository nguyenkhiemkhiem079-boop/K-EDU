# V-ACT Source Bank

Kho tài liệu nguồn gốc phục vụ ngân hàng câu hỏi ĐGNL ĐHQG-HCM (V-ACT) của hệ thống K-EDU.

## Cấu trúc thư mục nguồn (Source-First)

```
TÀI LIỆU/DGNL/V-ACT/
├── 00_OFFICIAL/                 # Đề thi chính thức ĐHQG-HCM (2024, 2025)
├── 01_FULL_TESTS/               # Bộ đề thi thử 120 câu hoàn chỉnh & các sách tuyển tập đề
├── 02_SUBJECT_BANKS/            # Ngân hàng câu hỏi theo phân môn
│   ├── VIETNAMESE/              # Chuyên đề & bài tập Tiếng Việt
│   ├── ENGLISH/                 # Chuyên đề & bài tập Tiếng Anh
│   ├── MATH/                    # Chuyên đề & bài tập Toán học
│   ├── LOGIC_DATA/              # Chuyên đề Tư duy logic & Phân tích số liệu
│   └── SCIENTIFIC_REASONING/    # Chuyên đề Khoa học Tự nhiên & Xã hội
├── 90_PENDING/                  # Tài liệu ngoài phạm vi / chờ thẩm định
├── 99_DUPLICATES/               # Các bản sao trùng lặp byte (SHA-256 identical)
├── source-manifest.json         # Danh mục định danh & hash toàn bộ tài liệu nguồn
└── README.md                    # Tài liệu hướng dẫn này
```

## Quy tắc biên mục & nguồn gốc (Provenance)
1. Mọi câu hỏi trong ngân hàng V-ACT đều phải truy nguyên được đến tệp PDF nguồn có mã định danh `sourceId` trong `source-manifest.json`.
2. Không sinh câu hỏi ảo hoặc dùng câu hỏi Toán thông thường thay thế câu hỏi V-ACT.
3. Không tự ý chỉnh sửa nội dung byte của các tệp PDF nguồn.
