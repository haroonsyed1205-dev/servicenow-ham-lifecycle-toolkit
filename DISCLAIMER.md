## About this project

This is a **personal portfolio project**. It is original code written to show
ServiceNow design and scripting patterns. It does **not** contain code, data,
configuration or documentation from any employer or client.

- All sample data is synthetic.
- The first version was generated with AI assistance as a starting point and
  is being reviewed, tested and extended on a ServiceNow Personal Developer
  Instance (PDI).
- Business logic lives in plain Script Includes so it can be unit tested with
  Node outside the platform; the platform-facing scripts (Business Rules,
  Transform Map scripts, Scripted REST resources, scheduled jobs) are thin
  wrappers around them.
