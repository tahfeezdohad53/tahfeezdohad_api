import { format } from "date-fns";
import { formatName } from "../controller/leave.js";
import { formatCurrency } from "../helpers/formatCurrency.js";
import numberToWords from 'number-to-words';

export function receiptTemplate({
  paidAt,
  receiptNumber,
  student,
  amount,
  transactionId,
}) { 
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
    
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
        <title>Receipt</title>
    
        <style>
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
    
          body {
            background-color: #f2f2f2 !important;
            font-family: Arial, Helvetica, sans-serif;
            color: #000000;
          }
    
          table {
            border-collapse: collapse;
          }
    
          .receipt-container {
            width: 100% !important;
            max-width: 700px !important;
            background-color: #ffffff !important;
            border: 1px solid #dcdcdc;
          }
    
          .receipt-padding {
            padding: 30px;
          }
    
          .main-title {
            font-size: 16px;
            line-height: 21px;
            font-weight: bold;
          }
    
          .amount-words {
            font-size: 15px;
            line-height: 20px;
            font-weight: bold;
          }
    
          .receipt-id {
            width: 100px;
            max-width: 100px;
            border-bottom: 1px solid #000000;
            padding-top: 4px;
            padding-bottom: 3px;
            text-align: center;
            font-size: 11px;
            line-height: 14px;
            word-break: break-all;
            overflow-wrap: anywhere;
          }
    
          .receipt-type-label {
            width: 120px;
            padding-right: 10px;
            font-size: 11px;
            line-height: 16px;
            font-weight: bold;
          }
    
          .urdu {
            direction: rtl;
            unicode-bidi: embed;
          }
    
          @media only screen and (max-width: 720px) {
            body {
              padding: 0 !important;
            }
    
            .receipt-container {
              width: 100% !important;
              max-width: 100% !important;
            }
    
            .receipt-padding {
              padding: 18px 12px !important;
            }
    
            .main-title {
              font-size: 15px !important;
              line-height: 20px !important;
            }
    
            .amount-words {
              font-size: 14px !important;
              line-height: 19px !important;
            }
    
            .date-column,
            .receipt-column {
              width: 50% !important;
            }
    
            .date-column {
              padding-right: 4px !important;
            }
    
            .receipt-column {
              padding-left: 4px !important;
            }
    
            .receipt-column table {
              width: 100% !important;
            }
    
            .receipt-column td {
              white-space: normal !important;
            }
    
            .receipt-id {
              width: 75px !important;
              max-width: 75px !important;
              font-size: 10px !important;
              line-height: 13px !important;
              word-break: break-all !important;
              overflow-wrap: anywhere !important;
            }
    
            .label-column {
              width: 50px !important;
              padding-right: 7px !important;
            }
    
            .receipt-type-label {
              width: 80px !important;
              padding-right: 7px !important;
              white-space: normal !important;
            }
    
            .receipt-type-value {
              padding-left: 0 !important;
            }
    
            .header-small {
              font-size: 9px !important;
              line-height: 13px !important;
            }
    
            .header-info {
              font-size: 11px !important;
              line-height: 16px !important;
            }
    
            .receipt-label {
              font-size: 11px !important;
              line-height: 15px !important;
            }
    
            .receipt-value {
              font-size: 11px !important;
              line-height: 15px !important;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
            }
    
            .payment-details {
              font-size: 11px !important;
              line-height: 16px !important;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
            }
          }
    
          @media only screen and (max-width: 380px) {
            .receipt-padding {
              padding: 15px 10px !important;
            }
    
            .main-title {
              font-size: 14px !important;
              line-height: 18px !important;
            }
    
            .amount-words {
              font-size: 13px !important;
              line-height: 18px !important;
            }
    
            .receipt-id {
              width: 65px !important;
              max-width: 65px !important;
              font-size: 9px !important;
              line-height: 12px !important;
            }
    
            .receipt-type-label {
              width: 70px !important;
            }
          }
        </style>
      </head>
    
      <body
        bgcolor="#f2f2f2"
        style="
        margin:0;
        padding:20px;
        width:100%;
        background-color:#f2f2f2 !important;
        font-family:Arial, Helvetica, sans-serif;
        color:#000000;
      "
      >
        <!-- BACKGROUND -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          bgcolor="#f2f2f2"
          style="
          width:100%;
          background-color:#f2f2f2 !important;
        "
        >
          <tr>
            <td align="center" valign="top">
              <!-- RECEIPT -->
              <table
                class="receipt-container"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                bgcolor="#ffffff"
                style="
                width:100%;
                max-width:700px;
                background-color:#ffffff !important;
                border:1px solid #dcdcdc;
                color:#000000;
              "
              >
                <tr>
                  <td
                    class="receipt-padding"
                    style="
                    padding:30px;
                    color:#000000;
                  "
                  >
                    <!-- ================= HEADER ================= -->
    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="color:#000000;">
                          <div
                            class="header-small"
                            style="
                            font-size:10px;
                            line-height:14px;
                          "
                          >
                            DAWOODI BOHRA JAMAAT ANJUMAN E MOHAMMEDI
                          </div>
    
                          <div
                            class="main-title"
                            style="
                            margin-top:5px;
                            font-size:16px;
                            line-height:21px;
                            font-weight:bold;
                          "
                          >
                            DAWOODI BOHRA JAMAT ANJUMAN-E-MOHAMMEDI, DAHOD
                          </div>
    
                          <div
                            class="header-info"
                            style="
                            margin-top:12px;
                            font-size:11px;
                            line-height:16px;
                            font-weight:bold;
                          "
                          >
                            TRUST REGN NO :- B/5(DAHOD)
                          </div>
    
                          <div
                            class="header-info"
                            style="
                            margin-top:7px;
                            font-size:11px;
                            line-height:16px;
                            font-weight:bold;
                          "
                          >
                            MANAGED BY :- ANJUMAN-E-MOHAMMEDI
                          </div>
                        </td>
                      </tr>
                    </table>
    
                    <!-- ================= DATE / RECEIPT NO ================= -->
    
                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                      width:100%;
                      margin-top:25px;
                      table-layout:fixed;
                    "
                    >
                      <tr>
                        <!-- DATE -->
                        <td
      class="date-column"
      width="50%"
      valign="middle"
      style="
        width:50%;
        padding-right:5px;
      "
    >
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
      >
        <tr>
    
          <!-- DATE -->
          <td
            valign="middle"
            style="
              
              line-height:16px;
              font-weight:bold;
              
            "
          >
            تاريخ
          </td>
    
          <!-- DATE VALUE -->
          <td
            valign="middle"
            style="
              
              border-bottom:1px solid #000000;
              padding:4px 0 3px;
              font-size:11px;
              line-height:15px;
              white-space:nowrap;
            "
          >
            ${format(paidAt, "dd MMM yyyy")}
          </td>
    
        </tr>
      </table>
    </td>
    
                        <!-- RECEIPT NUMBER -->
                        <td
                          class="receipt-column"
                          width="50%"
                          valign="top"
                          align="right"
                          style="
                          width:50%;
                          padding-left:5px;
                        "
                        >
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" align="right">
                            <tr>
                              <td
                                valign="bottom"
                                align="right"
                                style="
                                padding-right:5px;
                                font-size:12px;
                                line-height:16px;
                                font-weight:bold;
                                white-space:nowrap;
                              "
                              >
                                <span class="urdu"> رسید نمبر </span>
                              </td>
    
                              <td
                                valign="bottom"
                                class="receipt-id"
                                style="
                                width:100px;
                                max-width:100px;
                                border-bottom:1px solid #000000;
                                padding-top:4px;
                                padding-bottom:3px;
                                text-align:center;
                                font-size:11px;
                                line-height:14px;
                                word-break:break-all;
                                overflow-wrap:anywhere;
                              "
                              >
                                ${String(receiptNumber).padStart(3, "0")}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
    
                    <!-- ================= STUDENT DETAILS ================= -->
    
                    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin-top:20px;
      "
    >
      <!-- ================= NAME ================= -->
      <tr>
    
        <!-- ARABIC TEXT -->
        <td
          valign="middle"
          style="
            width:130px;
            padding:6px 8px 6px 0;
            font-size:12px;
            line-height:16px;
            white-space:nowrap;
          "
        >
          <span class="urdu">
            (حفظه الله تعالى)
          </span>
        </td>
    
        <!-- NAME FIELD -->
        <td
          class="receipt-value"
          valign="middle"
          style="
            padding:6px 0;
    
            border-bottom:1px solid #000000;
            font-size:12px;
            line-height:16px;
            overflow-wrap:anywhere;
            word-break:break-word;
          "
        >
          ${formatName(student.name)}
        </td>
    
        <!-- NAME LABEL -->
        <td
          valign="middle"
          style="
            width:45px;
            padding:6px 0 6px 8px;
            font-size:12px;
            line-height:16px;
            font-weight:bold;
            white-space:nowrap;
          "
        >
          <span class="urdu">
            نام
          </span>
        </td>
    
      </tr>
    
    
      <!-- ================= ITS ID ================= -->
      <tr>
    
        <!-- ITS LABEL -->
        <td
          valign="middle"
          style="
            padding:6px 8px 6px 0;
            font-size:12px;
            line-height:16px;
            font-weight:bold;
            white-space:nowrap;
          "
        >
          ITS ID.
        </td>
    
        <!-- ITS FIELD -->
        <td
          class="receipt-value"
          valign="middle"
          style="
            padding:6px 0;
            border-bottom:1px solid #000000;
            font-size:12px;
            line-height:16px;
            overflow-wrap:anywhere;
            word-break:break-word;
          "
        >
          ${student.its}
        </td>
    
        <!-- EMPTY RIGHT CELL -->
        <td
          style="
            width:45px;
          "
        >
        </td>
    
      </tr>
    
    
      <!-- ================= ADDRESS ================= -->
      <tr>
    
        <!-- ADDRESS LABEL -->
        <td
          valign="middle"
          style="
            width:130px;
            padding:6px 8px 6px 0;
            font-size:12px;
            line-height:16px;
            font-weight:bold;
            white-space:nowrap;
          "
        >
          Add.
        </td>
    
        <!-- ADDRESS FIELD -->
        <td
          class="receipt-value"
          valign="middle"
          style="
            padding:6px 0;
            border-bottom:1px solid #000000;
            font-size:12px;
            line-height:16px;
            overflow-wrap:anywhere;
            word-break:break-word;
          "
        >
          ${student.address}
        </td>
    
        <!-- EMPTY RIGHT CELL -->
        <td
          style="
            width:45px;
          "
        >
        </td>
    
      </tr>
    
    </table>
    
    
    <!-- ================= SALAM ================= -->
    
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin-top:22px;
      "
    >
      <tr>
        <td
          align="center"
          class="urdu"
          style="
            font-size:20px;
            line-height:30px;
            font-weight:bold;
          "
        >
          بعد السلام الجميل
        </td>
      </tr>
    </table>
    
                    <!-- ================= AMOUNT IN WORDS ================= -->
    
    
    
    
    <!-- ================= AMOUNT ================= -->
    
    <!-- ================= AMOUNT ================= -->
    
    <!-- ================= AMOUNT ================= -->
    
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin-top:18px;
      "
    >
      <tr>
    
        <!-- AMOUNT IN WORDS -->
        <td
          valign="middle"
          align="right"
          style="
            padding:0 5px 8px 0;
            border-bottom:1px solid #000000;
            font-size:15px;
            line-height:20px;
            font-weight:normal;
            white-space:nowrap;
          "
        >
          ${numberToWords
            .toWords(Number(String(amount).replace(/,/g, "")))
            .replace(/\b\w/g, (char) => char.toUpperCase())} Only
        </td>
    
        <!-- ANKH -->
        <td
          valign="middle"
          align="center"
          style="
            width:45px;
            padding:0 4px 8px;
            font-size:13px;
            line-height:20px;
            font-weight:bold;
            white-space:nowrap;
          "
        >
          <span class="urdu">
            انکە
          </span>
        </td>
    
        <!-- AMOUNT -->
        <td
          valign="middle"
          align="right"
          style="
            width:120px;
            padding:0 4px 8px;
            border-bottom:1px solid #000000;
            font-size:14px;
            line-height:20px;
            white-space:nowrap;
          "
        >
          <b>${formatCurrency().format(amount)}</b>
        </td>
    
        <!-- آپ طرف سی‌ -->
        <td
          valign="middle"
          align="right"
          style="
            width:95px;
            padding:0 0 8px 10px;
            font-size:12px;
            line-height:20px;
            white-space:nowrap;
          "
        >
          <span class="urdu">
            آپ طرف سے
          </span>
        </td>
    
      </tr>
    </table>
    
    
    <!-- ================= PAYMENT DETAILS ================= -->
    
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin-top:12px;
      "
    >
      <tr>
        <td
          class="payment-details"
          style="
            font-size:11px;
            line-height:16px;
            color:#000000;
            overflow-wrap:anywhere;
            word-break:break-word;
            text-align:left;
          "
        >
          By Online (Dt.: ${format(paidAt, "dd MMM yyyy")}, Ref.No.: ${transactionId})
        </td>
      </tr>
    </table>
    
    
    <!-- ================= RECEIPT TYPE ================= -->
    
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin-top:20px;
      "
    >
      <tr>
        <td
          align="center"
          style="
            font-size:0;
            line-height:0;
            white-space:nowrap;
          "
        >
    
          <span
            class="urdu"
            style="
              display:inline-block;
              vertical-align:middle;
              font-size:16px;
              line-height:22px;
              font-weight:bold;
              margin-right:35px;
            "
          >
            طریقے وصول تھیا چھے
          </span>
    
          <span
            style="
              display:inline-block;
              vertical-align:middle;
              font-size:16px;
              line-height:22px;
              font-weight:bold;
              color:#000000;
            "
          >
            Donation
          </span>
    
        </td>
      </tr>
    
      <tr>
        <td
          align="center"
          style="
            padding-top:22px;
            font-size:0;
            line-height:0;
          "
        >
          <span
            class="urdu"
            style="
              font-size:16px;
              line-height:22px;
              font-weight:bold;
            "
          >
            (وصول کرنا ني صحیح) عبد سیدنا طع
          </span>
        </td>
      </tr>
    </table>
    
    
    <!-- ================= DIVIDER ================= -->
    
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin-top:30px;
      "
    >
      <tr>
        <td
          style="
            border-top:1px solid #000000;
            font-size:0;
            line-height:0;
          "
        >
          &nbsp;
        </td>
      </tr>
    </table>
    
                    <!-- ================= FOOTER ================= -->
    
                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                      width:100%;
                      margin-top:7px;
                    "
                    >
                      <tr>
                        <td
                          align="center"
                          style="
                          color:#666666;
                          font-size:10px;
                          line-height:14px;
                        "
                        >
                          This is a computer-generated receipt.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}