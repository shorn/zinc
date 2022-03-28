resource "aws_s3_bucket_object" "readme"{
  bucket = "tf-download-state"
  key = "readme.txt"
  content_type = "text/plain"
  content = <<-EOT
    This bucket stores the Terraform state.
    Bucket was either created manually, or via the createS3StateBucket task.
  EOT
}