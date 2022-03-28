variable "tfd_region" {
  default = "ap-southeast-2"
}

locals {
  sourcecode = "github.com/shorn/tf-download"
}

/*
can't parameterise because:
 "terraform.backend: configuration cannot contain interpolations
*/
terraform {
  required_version = ">= 1.0"

  /* S3 bucket is used to init and store TF state information.
  Bucket must be manually created before TF can be run. */
  backend "s3" {
    bucket = "tf-download-state"
    key    = "tf-download.tfstate"
    region = "ap-southeast-2"
  }

  required_providers {
    aws = {
      // hostname makes clear this is actually an external dependency
      source  = "registry.terraform.io/hashicorp/aws"
      version = "3.74.0"
    }
  }
}

provider "aws" {
  region = var.tfd_region
}


