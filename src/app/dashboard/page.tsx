    fontSize: 13,
    color: "#6b7280",
  }}
>
  {expense.date}
</div>
             

                <div
  style={{
    minWidth: 0,
  }}
>
                <div
  style={{
    fontSize: 14,
    color: "#111827",
    overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
  }}
>
  <strong>
    {expense.item}
  </strong>
</div>

           <div
  style={{
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
    overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap",
  }}
>
 {expense.major_category || "其他"}
{expense.category ? ` / ${expense.category}` : ""}
{expense.card_name ? ` / ${expense.card_name}` : ""}
                  </div>
                </div>

                <div
                style={{
  fontWeight: 700,
  textAlign: "right",
  color: "#111827",
  whiteSpace: "nowrap",
}}
                >
                  {expense.currency ||
                    "USD"}{" "}
                  {formatNumber(
                    Number(
                      expense.amount
                    )
                  )}
                </div>
              </div>
            )
          )
        )}

        {/* A11-2. 載入更多 */}

        {monthlyExpenseVisibleCount <
          filteredMonthlyExpenses.length && (
          <button
            onClick={() =>
              setMonthlyExpenseVisibleCount(
                (count) =>
                  count + 20
              )
            }
            style={{
  marginTop: 14,
  padding: "8px 14px",
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
}}
          >
            載入更多
          </button>
        )}
      </section>

      {/* ======================================================================
          A12. 回到頂端
      ====================================================================== */}

      <button
        onClick={() =>
          scrollToSection(
            "dashboard-top"
          )
        }
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border:
            "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
          fontSize: 20,
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.15)",
        }}
        aria-label="回到頂端"
      >
        ↑
      </button>
    </main>
  );
}
