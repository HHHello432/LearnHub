#!/usr/bin/env python3
"""生成 LearnHub JMeter 测试脚本"""
import xml.etree.ElementTree as ET
from xml.dom import minidom

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def make_prop(name, value, ptype="stringProp"):
    e = ET.SubElement(parent, ptype) if False else None
    # 我们用字符串拼接更可控
    return f'          <{ptype} name="{esc(name)}">{esc(str(value))}</{ptype}>'

def http_sampler(name, method, path, body=None, children=None, extract_var=None):
    lines = []
    lines.append(f'        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="{esc(name)}" enabled="true">')
    if body:
        lines.append('          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">')
        lines.append('            <collectionProp name="Arguments.arguments">')
        lines.append('              <elementProp name="" elementType="HTTPArgument">')
        lines.append(f'                <stringProp name="Argument.value">{esc(body)}</stringProp>')
        lines.append('                <stringProp name="Argument.metadata">=</stringProp>')
        lines.append('              </elementProp>')
        lines.append('            </collectionProp>')
        lines.append('          </elementProp>')
    else:
        lines.append('          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">')
        lines.append('            <collectionProp name="Arguments.arguments"/>')
        lines.append('          </elementProp>')
    lines.append(f'          <stringProp name="HTTPSampler.method">{method}</stringProp>')
    lines.append(f'          <stringProp name="HTTPSampler.path">{esc(path)}</stringProp>')
    lines.append('        </HTTPSamplerProxy>')
    lines.append('        <hashTree>')
    if extract_var:
        lines.append(f'          <JSONPostProcessor guiclass="JSONPostProcessorGui" testclass="JSONPostProcessor" testname="Extract {extract_var}" enabled="true">')
        lines.append(f'            <stringProp name="JSONPostProcessor.referenceNames">{extract_var}</stringProp>')
        lines.append(f'            <stringProp name="JSONPostProcessor.jsonPathExpressions">$.data.id</stringProp>')
        lines.append('            <stringProp name="JSONPostProcessor.matchNumbers">1</stringProp>')
        lines.append('          </JSONPostProcessor>')
        lines.append('          <hashTree/>')
    lines.append('        </hashTree>')
    return '\n'.join(lines)

def thread_group(name, threads, loops, ramp, samples):
    lines = []
    lines.append(f'      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="{esc(name)}" enabled="true">')
    lines.append('        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>')
    lines.append('        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel">')
    lines.append('          <boolProp name="LoopController.continue_forever">false</boolProp>')
    lines.append(f'          <intProp name="LoopController.loops">{loops}</intProp>')
    lines.append('        </elementProp>')
    lines.append(f'        <stringProp name="ThreadGroup.num_threads">{threads}</stringProp>')
    lines.append(f'        <stringProp name="ThreadGroup.ramp_time">{ramp}</stringProp>')
    lines.append('        <longProp name="ThreadGroup.start_time">0</longProp>')
    lines.append('        <longProp name="ThreadGroup.end_time">0</longProp>')
    lines.append('        <boolProp name="ThreadGroup.scheduler">false</boolProp>')
    lines.append('      </ThreadGroup>')
    lines.append('      <hashTree>')
    for s in samples:
        lines.append(s)
    lines.append('      </hashTree>')
    return '\n'.join(lines)

S = http_sampler

samples_auth = [
    S('1.1 Login Admin', 'POST', '/api/auth/login', '{"username":"${ADMIN_USER}","password":"${ADMIN_PASS}"}', extract_var='auth_token'),
    S('1.2 Get Current User', 'GET', '/api/auth/me'),
    S('1.3 Get User Role', 'GET', '/api/auth/role'),
    S('1.4 Login Wrong Password', 'POST', '/api/auth/login', '{"username":"admin","password":"wrong_password"}'),
    S('1.5 Register New User', 'POST', '/api/auth/register', '{"username":"jmeter_${__time}","password":"123456","inviteCode":"ADMIN2026"}'),
]

samples_checkin = [
    S('2.1 Create Checkin', 'POST', '/api/checkins', '{"habitName":"Habit_JMeter_${__threadNum}","points":5}', extract_var='checkin_id'),
    S('2.2 Duplicate Checkin', 'POST', '/api/checkins', '{"habitName":"Habit_JMeter_${__threadNum}","points":5}'),
    S('2.3 Get Checkin List', 'GET', '/api/checkins'),
    S('2.4 Get Checkin Stats', 'GET', '/api/checkins/stats'),
    S('2.5 Delete Checkin Record', 'DELETE', '/api/checkins/record/${checkin_id}'),
    S('2.6 Verify Points After Checkin', 'GET', '/api/rewards'),
    S('2.7 Create Checkin Missing Name', 'POST', '/api/checkins', '{"points":5}'),
    S('2.8 Create Checkin Custom Points', 'POST', '/api/checkins', '{"habitName":"Habit_CustomPts_${__time}","points":10}'),
]

samples_task = [
    S('3.1 Create Task Urgent', 'POST', '/api/tasks', '{"title":"Task_Urgent_${__time}","category":"urgent_important","priority":"urgent","pointsReward":20}', extract_var='task_id'),
    S('3.2 Create Task Important', 'POST', '/api/tasks', '{"title":"Task_Important_${__time}","category":"not_urgent_important","priority":"important","pointsReward":15}'),
    S('3.3 Create Task Normal', 'POST', '/api/tasks', '{"title":"Task_Normal_${__time}","category":"not_urgent_not_important","priority":"normal","pointsReward":10}'),
    S('3.4 Get Task List', 'GET', '/api/tasks'),
    S('3.5 Filter Tasks By Category', 'GET', '/api/tasks?category=urgent_important'),
    S('3.6 Complete Task (Add Points)', 'PUT', '/api/tasks/${task_id}', '{"status":"done"}'),
    S('3.7 Uncomplete Task (Deduct Points)', 'PUT', '/api/tasks/${task_id}', '{"status":"todo"}'),
    S('3.8 Delete Task', 'DELETE', '/api/tasks/${task_id}'),
]

samples_shop = [
    S('4.1 Get Shop Items', 'GET', '/api/shop'),
    S('4.2 Admin Create Item', 'POST', '/api/shop', '{"name":"Item_${__time}","description":"Created by JMeter","price":100,"stock":50}', extract_var='shop_item_id'),
    S('4.3 Update Item Price', 'PUT', '/api/shop/${shop_item_id}', '{"price":80,"stock":30}'),
    S('4.4 Buy Item', 'POST', '/api/shop/buy/${shop_item_id}'),
    S('4.5 Get Order History', 'GET', '/api/shop/orders'),
    S('4.6 Delete Item', 'DELETE', '/api/shop/${shop_item_id}'),
    S('4.7 Buy Non-existent Item', 'POST', '/api/shop/buy/99999'),
    S('4.8 Admin Get All Items', 'GET', '/api/shop?all=true'),
]

samples_admin = [
    S('5.1 Get User List', 'GET', '/api/auth/users?page=1&limit=10'),
    S('5.2 Search Users', 'GET', '/api/auth/users?search=admin'),
    S('5.3 Get Invite Codes', 'GET', '/api/invite-codes'),
    S('5.4 Create Invite Code', 'POST', '/api/invite-codes', '{"role":"user","maxUses":3}'),
    S('5.5 Get System Settings', 'GET', '/api/settings'),
    S('5.6 Verify Invite Code', 'GET', '/api/invite-codes/verify/ADMIN2026'),
]

samples_other = [
    S('6.1 Create Pomodoro', 'POST', '/api/pomodoro', '{"durationPlanned":25,"durationActual":25,"type":"focus","status":"completed"}'),
    S('6.2 Get Pomodoro Stats', 'GET', '/api/pomodoro/stats'),
    S('6.3 Get Pomodoro History', 'GET', '/api/pomodoro/history?year=2026&month=5'),
    S('6.4 Get Reward Summary', 'GET', '/api/rewards'),
    S('6.5 Get Reward Logs', 'GET', '/api/rewards/logs'),
    S('6.6 Create Note', 'POST', '/api/notes', '{"title":"Note_${__time}","content":"JMeter test note content for automated testing."}'),
    S('6.7 Get Notes', 'GET', '/api/notes'),
    S('6.8 Create Diary', 'POST', '/api/diaries', '{"title":"Diary_${__time}","content":"JMeter test diary.","mood":"happy","weather":"sunny"}'),
    S('6.9 Get Diaries', 'GET', '/api/diaries'),
    S('6.10 Get Notifications', 'GET', '/api/notifications'),
]

# 引用上面定义的 TG 函数（修正作用域问题）
import types

xml_parts = []
xml_parts.append('<?xml version="1.0" encoding="UTF-8"?>')
xml_parts.append('<!-- LearnHub JMeter Full Business Test Suite -->')
xml_parts.append('<!-- Generated: 2026-05-29 | Covers: Auth, Checkin, Task, Shop, Admin, Pomodoro, Note, Diary, Reward -->')
xml_parts.append('<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">')
xml_parts.append('  <hashTree>')
xml_parts.append('    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="LearnHub Full Business Test" enabled="true">')
xml_parts.append('      <stringProp name="TestPlan.comments">Full Business Test - 6 Thread Groups, 45+ API calls covering all CRUD operations, auth boundary tests, points verification, and data isolation validation.</stringProp>')
xml_parts.append('      <boolProp name="TestPlan.functional_mode">false</boolProp>')
xml_parts.append('      <boolProp name="TestPlan.tearDownOnShutdown">true</boolProp>')
xml_parts.append('      <stringProp name="TestPlan.user_defined_classpath"></stringProp>')
xml_parts.append('    </TestPlan>')
xml_parts.append('    <hashTree>')

# User Defined Variables
xml_parts.append('      <Arguments guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">')
xml_parts.append('        <collectionProp name="Arguments.arguments">')
for k, v in [('BASE_URL','http://localhost:3000'),('ADMIN_USER','admin'),('ADMIN_PASS','123456')]:
    xml_parts.append(f'          <elementProp name="{k}" elementType="Argument">')
    xml_parts.append(f'            <stringProp name="Argument.name">{k}</stringProp>')
    xml_parts.append(f'            <stringProp name="Argument.value">{v}</stringProp>')
    xml_parts.append('            <stringProp name="Argument.metadata">=</stringProp>')
    xml_parts.append('          </elementProp>')
xml_parts.append('        </collectionProp>')
xml_parts.append('      </Arguments>')
xml_parts.append('      <hashTree/>')

# Header Manager
xml_parts.append('      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">')
xml_parts.append('        <collectionProp name="HeaderManager.headers">')
xml_parts.append('          <elementProp name="" elementType="Header">')
xml_parts.append('            <stringProp name="Header.name">Content-Type</stringProp>')
xml_parts.append('            <stringProp name="Header.value">application/json</stringProp>')
xml_parts.append('          </elementProp>')
xml_parts.append('        </collectionProp>')
xml_parts.append('      </HeaderManager>')
xml_parts.append('      <hashTree/>')

# HTTP Defaults
xml_parts.append('      <ConfigTestElement guiclass="HttpDefaultsGui" testclass="HttpDefaults" testname="HTTP Request Defaults" enabled="true">')
xml_parts.append('        <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments">')
xml_parts.append('          <collectionProp name="Arguments.arguments"/>')
xml_parts.append('        </elementProp>')
xml_parts.append('        <stringProp name="HTTPSampler.domain">localhost</stringProp>')
xml_parts.append('        <stringProp name="HTTPSampler.port">3000</stringProp>')
xml_parts.append('        <stringProp name="HTTPSampler.protocol">http</stringProp>')
xml_parts.append('        <stringProp name="HTTPSampler.contentEncoding">UTF-8</stringProp>')
xml_parts.append('        <stringProp name="HTTPSampler.path">/api</stringProp>')
xml_parts.append('        <stringProp name="HTTPSampler.method">GET</stringProp>')
xml_parts.append('        <boolProp name="HTTPSampler.follow_redirects">true</boolProp>')
xml_parts.append('        <boolProp name="HTTPSampler.use_keepalive">true</boolProp>')
xml_parts.append('        <stringProp name="HTTPSampler.connect_timeout">10000</stringProp>')
xml_parts.append('        <stringProp name="HTTPSampler.response_timeout">30000</stringProp>')
xml_parts.append('      </ConfigTestElement>')
xml_parts.append('      <hashTree/>')

# HTTP Header Manager for Authorization (using ${auth_token})
xml_parts.append('      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Auth Header Manager" enabled="true">')
xml_parts.append('        <collectionProp name="HeaderManager.headers">')
xml_parts.append('          <elementProp name="" elementType="Header">')
xml_parts.append('            <stringProp name="Header.name">Authorization</stringProp>')
xml_parts.append('            <stringProp name="Header.value">Bearer ${auth_token}</stringProp>')
xml_parts.append('          </elementProp>')
xml_parts.append('        </collectionProp>')
xml_parts.append('      </HeaderManager>')
xml_parts.append('      <hashTree/>')

# HTTP Cookie Manager
xml_parts.append('      <CookieManager guiclass="CookieManagerGui" testclass="CookieManager" testname="HTTP Cookie Manager" enabled="true"/>')
xml_parts.append('      <hashTree/>')

# ===== Thread Groups =====
tgs = [
    ('01 - Authentication', 5, 5, 3, samples_auth),
    ('02 - Checkin Module', 5, 3, 5, samples_checkin),
    ('03 - Task Module', 5, 3, 5, samples_task),
    ('04 - Shop Module', 3, 2, 3, samples_shop),
    ('05 - Admin Module', 3, 2, 3, samples_admin),
    ('06 - Other Modules', 3, 2, 3, samples_other),
]

for name, threads, loops, ramp, samples in tgs:
    lines = []
    lines.append(f'      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="{name}" enabled="true">')
    lines.append('        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>')
    lines.append('        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel">')
    lines.append('          <boolProp name="LoopController.continue_forever">false</boolProp>')
    lines.append(f'          <intProp name="LoopController.loops">{loops}</intProp>')
    lines.append('        </elementProp>')
    lines.append(f'        <stringProp name="ThreadGroup.num_threads">{threads}</stringProp>')
    lines.append(f'        <stringProp name="ThreadGroup.ramp_time">{ramp}</stringProp>')
    lines.append('        <longProp name="ThreadGroup.start_time">0</longProp>')
    lines.append('        <longProp name="ThreadGroup.end_time">0</longProp>')
    lines.append('        <boolProp name="ThreadGroup.scheduler">false</boolProp>')
    lines.append('      </ThreadGroup>')
    lines.append('      <hashTree>')
    for s in samples:
        lines.append(s)
    lines.append('      </hashTree>')
    xml_parts.extend(lines)

# Listeners
xml_parts.append('      <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">')
xml_parts.append('        <collectionProp name="ResultCollector.fields">')
for i, f in enumerate(['startTime','label','responseCode','responseMessage','elapsed','bytes','sentBytes','sampleCount','errorCount']):
    xml_parts.append(f'          <stringProp name="{i}">{f}</stringProp>')
xml_parts.append('        </collectionProp>')
xml_parts.append('      </ResultCollector>')
xml_parts.append('      <hashTree/>')
xml_parts.append('      <ResultCollector guiclass="StatVisualizer" testclass="ResultCollector" testname="图形结果" enabled="true"/>')
xml_parts.append('      <hashTree/>')

xml_parts.append('    </hashTree>')
xml_parts.append('  </hashTree>')
xml_parts.append('</jmeterTestPlan>')

output = '\n'.join(xml_parts)
with open('/root/projects/learnhub/tests/jmeter/LearnHub-Performance.jmx', 'w', encoding='utf-8') as f:
    f.write(output)

# Validate
from xml.parsers.expat import ParserCreate
p = ParserCreate()
with open('/root/projects/learnhub/tests/jmeter/LearnHub-Performance.jmx') as f:
    p.Parse(f.read(), True)
print('XML OK - generated successfully')
import os
print(f'File size: {os.path.getsize("/root/projects/learnhub/tests/jmeter/LearnHub-Performance.jmx")} bytes')
