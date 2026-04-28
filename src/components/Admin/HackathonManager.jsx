import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Trash2,
  Download,
  Filter,
  Calendar,
  Mail,
  User,
  BookOpen,
  GraduationCap,
  Cpu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const gradeLabels = {
  freshman: "大一",
  sophomore: "大二",
  junior: "大三",
  senior: "大四",
  master: "硕士",
  phd: "博士",
};

const aiToolLabels = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  trae: "Trae",
  other: "其他",
};

const HackathonManager = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/hackathon/registrations");
      setRegistrations(response.data);
    } catch (error) {
      toast.error("加载报名数据失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("确定要删除这条报名记录吗？")) return;

    try {
      await api.delete(`/admin/hackathon/registrations/${id}`);
      toast.success("已删除");
      fetchRegistrations();
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const handleExport = () => {
    const headers = ["姓名", "学号", "专业", "年级", "AI 工具", "AI 项目经历", "报名时间"];
    const data = registrations.map((r) => [
      r.name,
      r.student_id,
      r.major,
      gradeLabels[r.grade] || r.grade,
      JSON.parse(r.ai_tools || "[]").map((t) => aiToolLabels[t] || t).join(", "),
      (r.experience || "").replace(/"/g, '""'),
      new Date(r.created_at).toLocaleString("zh-CN"),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...data].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hackathon_registrations_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("导出成功");
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.major.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrade = gradeFilter ? reg.grade === gradeFilter : true;

    return matchesSearch && matchesGrade;
  });

  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const paginatedData = filteredRegistrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: registrations.length,
    filtered: filteredRegistrations.length,
    byGrade: registrations.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {}),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          黑客松报名管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">查看和管理所有报名参赛的学生信息</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总报名人数</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">当前显示</p>
              <p className="text-2xl font-bold mt-1">{stats.filtered}</p>
            </div>
            <Filter className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">大一 - 大二</p>
              <p className="text-2xl font-bold mt-1">
                {(stats.byGrade.freshman || 0) + (stats.byGrade.sophomore || 0)}
              </p>
            </div>
            <GraduationCap className="h-8 w-8 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">大三 - 大四</p>
              <p className="text-2xl font-bold mt-1">
                {(stats.byGrade.junior || 0) + (stats.byGrade.senior || 0)}
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索姓名、学号、专业..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">所有年级</option>
          <option value="freshman">大一</option>
          <option value="sophomore">大二</option>
          <option value="junior">大三</option>
          <option value="senior">大四</option>
          <option value="master">硕士</option>
          <option value="phd">博士</option>
        </select>

        <button
          onClick={handleExport}
          disabled={registrations.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          导出 CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>暂无报名数据</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">专业</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">年级</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI 工具</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI 项目经历</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">报名时间</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((reg, index) => {
                  const aiTools = JSON.parse(reg.ai_tools || "[]");
                  return (
                    <tr
                      key={reg.id}
                      className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {reg.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{reg.student_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{reg.major}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {gradeLabels[reg.grade] || reg.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {aiTools.map((tool) => (
                            <span
                              key={tool}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700"
                            >
                              <Cpu className="h-3 w-3" />
                              {aiToolLabels[tool] || tool}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[240px]">
                        <p className="line-clamp-2 break-words">{reg.experience || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(reg.created_at).toLocaleString("zh-CN")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(reg.id)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                第 {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} 条，共{" "}
                {filteredRegistrations.length} 条
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <span className="px-4 py-1.5 border rounded-lg text-sm bg-blue-50 text-blue-600 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HackathonManager;
