from typing import Any
import io
import logging

from services.maintenance_service import MaintenanceService
from services.compliance_service import ComplianceService
from services.llm_service import LLMService

logger = logging.getLogger("plantmind.report")


class ReportService:
    """Generates an executive report combining maintenance and compliance assessments.

    Attempts to render a PDF using ReportLab. If ReportLab is not available,
    returns an HTML string as fallback.
    """

    @classmethod
    def generate(cls, asset: str | None = None, sop_text: str | None = None, pdf: bool = True) -> dict[str, Any]:
        asset = (asset or "").strip()

        # Get maintenance assessment
        maintenance = MaintenanceService.assess(asset) if asset else {"error": "no asset provided"}

        # Get compliance assessment
        compliance = ComplianceService.assess_sop(sop_text, target=asset) if (sop_text or asset) else {"error": "no sop or target provided"}

        # Ask LLM to produce an executive summary combining both
        prompt = (
            "You are an executive summarizer. Produce a short executive summary (3-5 sentences) "
            "that synthesizes maintenance findings and compliance posture for the following asset. "
            "Include top-level risk and one-sentence recommended action.\n\n"
            f"Maintenance findings:\n{maintenance.get('failure_prediction') or maintenance.get('maintenance_history') or ''}\n\n"
            f"Compliance findings:\n{compliance.get('sop_check') or ''}\n\n"
            "Provide a short bulleted list of 3 AI-generated recommendations backed by citations if available."
        )

        try:
            executive_summary = LLMService.generate_answer(prompt, maintenance.get("citations", []) + compliance.get("citations", []))
        except Exception:
            logger.exception("LLM failed to generate executive summary")
            executive_summary = "Executive summary unavailable due to LLM error."

        report_html = cls._build_html_report(asset, maintenance, compliance, executive_summary)

        if pdf:
            try:
                # Try to render PDF via ReportLab
                from reportlab.lib.pagesizes import letter
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
                from reportlab.lib.styles import getSampleStyleSheet
                from reportlab.lib import colors

                buf = io.BytesIO()
                doc = SimpleDocTemplate(buf, pagesize=letter)
                styles = getSampleStyleSheet()
                story = []

                story.append(Paragraph(f"Executive Report: {asset}", styles["Title"]))
                story.append(Spacer(1, 12))
                story.append(Paragraph("Executive Summary", styles["Heading2"]))
                story.append(Paragraph(executive_summary.replace('\n', '<br/>'), styles["BodyText"]))
                story.append(Spacer(1, 12))

                story.append(Paragraph("Maintenance Summary", styles["Heading2"]))
                story.append(Paragraph(str(maintenance.get("maintenance_history", ""))[:1000], styles["BodyText"]))
                story.append(Spacer(1, 12))

                story.append(Paragraph("Compliance Summary", styles["Heading2"]))
                story.append(Paragraph(str(compliance.get("sop_check", ""))[:1000], styles["BodyText"]))
                story.append(Spacer(1, 12))

                story.append(Paragraph("Recommendations", styles["Heading2"]))
                story.append(Paragraph(str(maintenance.get("recommendations", "")), styles["BodyText"]))
                story.append(Spacer(1, 12))

                # Simple table with scores
                data = [["Metric", "Value"], ["Risk Score", str(maintenance.get("risk_score", "N/A"))], ["Compliance Score", str(compliance.get("compliance_score", "N/A"))]]
                table = Table(data, hAlign="LEFT")
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ]))
                story.append(table)

                doc.build(story)
                buf.seek(0)
                pdf_bytes = buf.read()
                return {"format": "pdf", "bytes": pdf_bytes}
            except Exception:
                logger.debug("ReportLab not available or PDF generation failed, falling back to HTML")

        return {"format": "html", "html": report_html}

    @staticmethod
    def _build_html_report(asset: str, maintenance: dict, compliance: dict, executive_summary: str) -> str:
        html = f"""
        <html>
        <head><meta charset="utf-8"><title>Executive Report - {asset}</title></head>
        <body>
        <h1>Executive Report: {asset}</h1>
        <h2>Executive Summary</h2>
        <p>{executive_summary}</p>
        <h2>Maintenance Summary</h2>
        <pre>{maintenance.get('maintenance_history')}</pre>
        <h2>Failure Predictions</h2>
        <pre>{maintenance.get('failure_prediction')}</pre>
        <h2>Compliance Summary</h2>
        <pre>{compliance.get('sop_check')}</pre>
        <h2>Compliance Score</h2>
        <p>{compliance.get('compliance_score')}</p>
        <h2>Recommendations</h2>
        <pre>{maintenance.get('recommendations')}</pre>
        <h2>Citations</h2>
        <pre>{maintenance.get('citations')}
{compliance.get('citations')}</pre>
        </body>
        </html>
        """
        return html
